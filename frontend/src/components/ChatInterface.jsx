import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { getGoals } from '../features/goals/goalSlice'

function ChatInterface() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || !user) return

    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', text: prompt }])
    
    // Clear input while keeping the string to send
    const sentPrompt = prompt;
    setPrompt('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ prompt: sentPrompt }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', text: `API Error: ${data.message || 'Failed to connect.'}` }])
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
      
      // Auto refresh the Dashboard's Goal List
      // If the AI modified the database, this instantly reflects the change in the UI!
      dispatch(getGoals())
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Error connecting to the AI helper.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="chat-container">
      {messages.length > 0 && (
        <div className="chat-history">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              <span className="chat-role">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
              <div className="chat-text">{msg.text}</div>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant typing">
              <span className="chat-role">AI Assistant</span>
              <div className="chat-text typing-indicator">
                 <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>
      )}
      <form onSubmit={onSubmit} className="chat-form">
        <input 
          type="text" 
          placeholder="Ask me to create, delete, or manage your goals..." 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          disabled={isLoading}
        />
        <button type="submit" className="btn btn-chat" disabled={isLoading || !prompt.trim()}>
          {isLoading ? 'Sending...' : 'Send Prompt'}
        </button>
      </form>
    </section>
  )
}

export default ChatInterface
