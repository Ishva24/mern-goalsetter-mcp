import axios from 'axios'

const API_URL = '/api/users/'

const getAuthConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

const syncMcpSession = async (token) => {
  if (!token) {
    return
  }

  await axios.post(API_URL + 'mcp-session', {}, getAuthConfig(token))
}

const clearMcpSession = async (token) => {
  if (!token) {
    return
  }

  await axios.delete(API_URL + 'mcp-session', getAuthConfig(token))
}

// Register user
const register = async (userData) => {
  const response = await axios.post(API_URL, userData)

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data))
    await syncMcpSession(response.data.token)
  }

  return response.data
}

// Login user
const login = async (userData) => {
  const response = await axios.post(API_URL + 'login', userData)

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data))
    await syncMcpSession(response.data.token)
  }

  return response.data
}

const restoreSession = async (token) => {
  await syncMcpSession(token)
}

// Logout user
const logout = async (token) => {
  await clearMcpSession(token)
  localStorage.removeItem('user')
}

const authService = {
  register,
  logout,
  login,
  restoreSession,
}

export default authService
