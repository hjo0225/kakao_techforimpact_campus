import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './app/AppContext'
import { NavigationProvider } from './app/navigation'
import './styles/index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <NavigationProvider>
            <App />
          </NavigationProvider>
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
)
