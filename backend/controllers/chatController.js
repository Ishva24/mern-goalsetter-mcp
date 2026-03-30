const asyncHandler = require('express-async-handler');
const OpenAI = require('openai');
const { getTools, callTool } = require('../services/mcpClient');

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Scope Array: The AI can ONLY execute these listed tools.
const ALLOWED_TOOLS = ["get_goals", "create_goal", "delete_goal"];

function formatToolsForOpenAI(mcpTools) {
  return mcpTools.map(tool => {
    const parameters = JSON.parse(JSON.stringify(tool.inputSchema));
    
    // Hide 'user_id' from the LLM 
    if (parameters.properties && parameters.properties.user_id) {
        delete parameters.properties.user_id;
    }
    if (parameters.required && Array.isArray(parameters.required)) {
        parameters.required = parameters.required.filter(req => req !== 'user_id');
    }

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: parameters
      }
    };
  });
}

// @desc    Chat with LLM via OpenRouter
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
  const openAiTools = formatToolsForOpenAI(mcpTools);

  const messages = [
    { 
      role: 'system', 
      content: 'You are an internal Goalsetter Assistant. Your ONLY purpose is to manage database goals using the provided tools. You are STRICTLY FORBIDDEN from answering general knowledge questions.' 
    },
    { 
      role: 'user', 
      content: prompt + "\n\n[CRITICAL DIRECTIVE: You MUST POLITELY REFUSE general explanations or non-goal requests. You are ONLY allowed to parse the prompt to create, delete, or fetch goals.]" 
    }
  ];

  let response = await openai.chat.completions.create({
    model: 'openrouter/free',
    messages: messages,
    tools: openAiTools,
  });

  const assistantMessage = response.choices[0].message;

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      
      // SCOPE VALIDATION: Ensure the tool is explicitly allowed
      if (!ALLOWED_TOOLS.includes(toolName)) {
         messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `ERROR: Execution of '${toolName}' is forbidden by system context boundary.`
         });
         continue; // Skip execution and prevent backend hit
      }

      const args = JSON.parse(toolCall.function.arguments);
      
      // Inject internal explicit User ID (Act-As Header context)
      const sanitizedArgs = {
          ...args,
          user_id: userId 
      };

      let toolResult;
      try {
          const mcpResponse = await callTool(toolName, sanitizedArgs);
          toolResult = mcpResponse.content[0].text;
      } catch (err) {
          toolResult = `Error running tool: ${err.message}`;
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }

    const secondResponse = await openai.chat.completions.create({
        model: 'openrouter/free',
        messages: messages,
        tools: openAiTools,
    });

    res.status(200).json({
      reply: secondResponse.choices[0].message.content
    });
  } else {
    res.status(200).json({
      reply: assistantMessage.content
    });
  }
});

module.exports = {
  chatWithLLM,
};
