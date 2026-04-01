const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getTools, callTool } = require('../services/mcpClient');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Lazy-initialize so it's always after dotenv has loaded
function getGenAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Scope Array: The AI can ONLY execute these listed tools.
const ALLOWED_TOOLS = ['get_goals', 'create_goal', 'delete_goal'];

/**
 * Convert MCP tool definitions to Gemini's functionDeclarations format.
 * We strip 'user_id' from the schema so the LLM never sees or controls it.
 */
function formatToolsForGemini(mcpTools) {
  const declarations = mcpTools.map(tool => {
    const parameters = JSON.parse(JSON.stringify(tool.inputSchema));

    // Hide 'user_id' from the LLM
    if (parameters.properties && parameters.properties.user_id) {
      delete parameters.properties.user_id;
    }
    if (parameters.required && Array.isArray(parameters.required)) {
      parameters.required = parameters.required.filter(req => req !== 'user_id');
    }

    // Gemini requires explicit type on the top-level parameters object
    if (!parameters.type) {
      parameters.type = 'object';
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: parameters,
    };
  });

  return [{ functionDeclarations: declarations }];
}

// @desc    Chat with LLM via Gemini
// @route   POST /api/chat
// @access  Private
const chatWithLLM = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400);
    throw new Error('Please add a prompt');
  }

  // We rely strictly on 'protect' middleware to verify req.user
  // Extracting verified User ID mitigates mid-process token expiration!
  const userId = req.user._id.toString();

  const mcpTools = await getTools();
  const geminiTools = formatToolsForGemini(mcpTools);

  const systemInstruction =
    'You are an internal Goalsetter Assistant. Your ONLY purpose is to manage database goals using the provided tools. ' +
    'If the user asks to delete a goal by its text name (e.g., "Delete Learn Java"), you MUST first use the get_goals tool to find the matching ID, and then execute the delete_goal tool. ' +
    'NEVER ask the user to provide raw hex IDs. ' +
    'You are STRICTLY FORBIDDEN from answering general knowledge questions.';

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemInstruction,
    tools: geminiTools,
  });

  // Gemini uses a mutable 'contents' array for conversation history
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text:
            prompt +
            '\n\n[CRITICAL DIRECTIVE: You MUST POLITELY REFUSE general explanations or non-goal requests. ' +
            'You are ONLY allowed to parse the prompt to create, delete, or fetch goals.]',
        },
      ],
    },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    let result;
    try {
      result = await model.generateContent({ contents });
    } catch (apiErr) {
      console.error('[Gemini API error]', apiErr.message);
      return res.status(200).json({ reply: `AI error: ${apiErr.message}` });
    }

    const response = result.response;

    // Guard: Gemini may return no candidates (e.g. safety block)
    if (!response.candidates || response.candidates.length === 0) {
      const reason = response.promptFeedback?.blockReason || 'unknown';
      console.warn('[Gemini] No candidates returned, blockReason:', reason);
      return res.status(200).json({
        reply: 'The AI was unable to process this request (blocked or no response).',
      });
    }

    const candidate = response.candidates[0];
    const assistantContent = candidate.content;

    // Guard: candidate may have no content (e.g. MAX_TOKENS or SAFETY finish)
    if (!assistantContent || !assistantContent.parts || assistantContent.parts.length === 0) {
      const reason = candidate.finishReason || 'unknown';
      console.warn('[Gemini] Empty content in candidate, finishReason:', reason);
      return res.status(200).json({
        reply: 'The AI returned an empty response. Please try rephrasing your request.',
      });
    }

    // Add the model's response to conversation history
    contents.push(assistantContent);

    // Check if the model wants to call any functions
    const functionCallParts = assistantContent.parts.filter(p => p.functionCall);

    if (functionCallParts.length > 0) {
      // Build all function response parts for this round
      const functionResponseParts = [];

      for (const part of functionCallParts) {
        const { name: toolName, args } = part.functionCall;

        // SCOPE VALIDATION: Ensure the tool is explicitly allowed
        if (!ALLOWED_TOOLS.includes(toolName)) {
          functionResponseParts.push({
            functionResponse: {
              name: toolName,
              response: {
                error: `Execution of '${toolName}' is forbidden by system context boundary.`,
              },
            },
          });
          continue;
        }

        // Inject the internal user ID - LLM never controls this
        const sanitizedArgs = { ...args, user_id: userId };

        let toolResultText;
        try {
          const mcpResponse = await callTool(toolName, sanitizedArgs);
          toolResultText = mcpResponse.content[0].text;
        } catch (err) {
          toolResultText = `Error running tool: ${err.message}`;
        }

        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: { result: toolResultText },
          },
        });
      }

      // Return all function results to the model in a single user turn
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      iterations++;
    } else {
      // The model responded with plain text - we're done!
      const textPart = assistantContent.parts.find(p => p.text);
      const safeReply =
        textPart && textPart.text.trim() !== ''
          ? textPart.text
          : 'I have successfully processed your request and updated the database!';

      return res.status(200).json({ reply: safeReply });
    }
  }

  // Safety Break: If the AI gets stuck in an infinite tool-calling loop
  return res.status(200).json({
    reply: 'I had to abort this action because the request required too many complex steps to process safely.',
  });
});

module.exports = {
  chatWithLLM,
};

