import { createSignal, createEffect, onMount, Show, For } from 'solid-js'
import { supabase, createEvent } from './supabaseClient'
import { Auth } from '@supabase/auth-ui-solid'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { SolidMarkdown } from "solid-markdown"

function App() {
  const [user, setUser] = createSignal(null)
  const [currentPage, setCurrentPage] = createSignal('landingPage')
  const [loading, setLoading] = createSignal(false)
  const [language, setLanguage] = createSignal('')
  const [scenario, setScenario] = createSignal('')
  const [conversation, setConversation] = createSignal([])
  const [userInput, setUserInput] = createSignal('')
  const [feedback, setFeedback] = createSignal('')
  const [showContinueOption, setShowContinueOption] = createSignal(false)

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      if (conversation().length > 0) {
        setCurrentPage('conversation')
      } else {
        setCurrentPage('languageSelection')
      }
    }
  }

  onMount(() => {
    checkUserSignedIn()

    // Restore state from localStorage
    const savedConversation = localStorage.getItem('conversation')
    const savedLanguage = localStorage.getItem('language')
    const savedScenario = localStorage.getItem('scenario')

    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    if (savedScenario) {
      setScenario(savedScenario)
    }

    if (savedConversation) {
      setConversation(JSON.parse(savedConversation))
      setCurrentPage('conversation')
    }
  })

  createEffect(() => {
    localStorage.setItem('conversation', JSON.stringify(conversation()))
  })

  createEffect(() => {
    localStorage.setItem('language', language())
  })

  createEffect(() => {
    localStorage.setItem('scenario', scenario())
  })

  createEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        if (conversation().length > 0) {
          setCurrentPage('conversation')
        } else {
          setCurrentPage('languageSelection')
        }
      } else {
        setUser(null)
        setCurrentPage('landingPage')
      }
    })

    return () => {
      authListener.data.unsubscribe()
    }
  })

  const handleGetStarted = () => {
    setCurrentPage('login')
  }

  const handleLanguageSelection = async (e) => {
    e.preventDefault()
    if (language().trim() === '') return
    setLoading(true)
    try {
      // Set the scenario to the specific one
      const scenarioResponse = "You are in a train station looking for your platform."
      setScenario(scenarioResponse)

      // Get the initial AI message in the target language
      const promptAI = `Pretend to be a person speaking the ${language()} language. Start a conversation in ${language()} based on the following scenario: "${scenarioResponse}". Speak only in ${language()}.`
      const aiResponse = await createEvent('chatgpt_request', {
        prompt: promptAI,
        response_type: 'text'
      })
      setConversation([{ sender: 'AI', message: aiResponse }])
      setCurrentPage('conversation')
    } catch (error) {
      console.error('Error starting conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserInput = async (e) => {
    e.preventDefault()
    if (userInput().trim() === '') return

    setLoading(true)
    try {
      setConversation([...conversation(), { sender: 'User', message: userInput() }])

      const prompt_feedback = `You are a language tutor. The student just responded: "${userInput()}". Evaluate the response for correctness and fluency in ${language()}. Provide feedback in English.`
      const feedbackResponse = await createEvent('chatgpt_request', {
        prompt: prompt_feedback,
        response_type: 'text'
      })
      setFeedback(feedbackResponse)
      setUserInput('')
      setShowContinueOption(true)
    } catch (error) {
      console.error('Error during conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    setLoading(true)
    setShowContinueOption(false)
    try {
      const prompt_ai = `Continue the conversation in ${language()} as per the scenario. Speak only in ${language()}.`
      const aiResponse = await createEvent('chatgpt_request', {
        prompt: prompt_ai,
        response_type: 'text'
      })
      setConversation([...conversation(), { sender: 'AI', message: aiResponse }])
      setFeedback('')
    } catch (error) {
      console.error('Error during conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEndConversation = () => {
    setFeedback('')
    setShowContinueOption(false)
    setConversation([...conversation(), { sender: 'AI', message: 'Goodbye! Thanks for practicing with me!' }])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setConversation([])
    setLanguage('')
    setScenario('')
    setUserInput('')
    setFeedback('')
    setShowContinueOption(false)
    localStorage.removeItem('conversation')
    localStorage.removeItem('language')
    localStorage.removeItem('scenario')
    setCurrentPage('landingPage')
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <Show when={currentPage() === 'landingPage'}>
        <div class="w-full max-w-4xl p-6 bg-white rounded-lg shadow-md">
          <h1 class="text-5xl font-bold mb-6 text-center">Welcome to Language Play</h1>
          <p class="text-xl mb-6 text-center">
            Practice and improve your language skills through interactive conversations with AI.
          </p>
          <div class="flex justify-center space-x-4">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
              onClick={handleGetStarted}
            >
              Get Started
            </button>
            <button
              class="px-6 py-3 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 cursor-pointer"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            >
              Learn More
            </button>
          </div>
          <div class="mt-12">
            <h2 class="text-3xl font-bold mb-4 text-center">Features</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <h3 class="text-xl font-semibold mb-2">Interactive Learning</h3>
                <p>Engage in real-time conversations to practice language skills.</p>
              </div>
              <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <h3 class="text-xl font-semibold mb-2">AI Feedback</h3>
                <p>Receive instant evaluations and constructive feedback.</p>
              </div>
              <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <h3 class="text-xl font-semibold mb-2">Multiple Languages</h3>
                <p>Choose any language you wish to learn and improve.</p>
              </div>
            </div>
          </div>
        </div>
      </Show>

      <Show when={currentPage() === 'login'}>
        <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 class="text-2xl font-bold mb-4 text-center">Sign in with ZAPT</h2>
          <a href="https://www.zapt.ai" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline mb-4 block text-center">
            Learn more about ZAPT
          </a>
          <Auth 
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google', 'facebook', 'apple']}
          />
        </div>
      </Show>

      <Show when={currentPage() === 'languageSelection'}>
        <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 class="text-2xl font-bold mb-4 text-center">Select Language to Learn</h2>
          <form onSubmit={handleLanguageSelection}>
            <input
              class="w-full px-4 py-2 mb-4 border rounded box-border"
              type="text"
              placeholder="Enter language (e.g., Spanish)"
              value={language()}
              onInput={(e) => setLanguage(e.target.value)}
            />
            <button
              type="submit"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
              disabled={loading()}
            >
              <Show when={loading()}>Starting...</Show>
              <Show when={!loading()}>Start Learning</Show>
            </button>
          </form>
          <button
            class="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </Show>

      <Show when={currentPage() === 'conversation'}>
        <div class="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md flex flex-col h-full">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Language: {language()}</h2>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
          <Show when={scenario()}>
            <div class="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
              <h3 class="text-xl font-semibold mb-2">Scenario:</h3>
              <div class="text-gray-700 prose">
                <SolidMarkdown children={scenario()} />
              </div>
            </div>
          </Show>
          <div class="flex-1 overflow-y-auto mb-4">
            <For each={conversation()}>
              {(msg) => (
                <div class={`mb-2 ${msg.sender === 'User' ? 'text-right' : 'text-left'}`}>
                  <div class={`inline-block px-4 py-2 rounded-lg ${msg.sender === 'User' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    <SolidMarkdown children={msg.message} />
                  </div>
                </div>
              )}
            </For>
          </div>
          <Show when={feedback()}>
            <div class="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <h3 class="font-semibold mb-2">Feedback:</h3>
              <div class="text-gray-700 prose">
                <SolidMarkdown children={feedback()} />
              </div>
            </div>
          </Show>
          <Show when={showContinueOption()}>
            <div class="flex space-x-4 my-4">
              <button
                class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                onClick={handleContinue}
                disabled={loading()}
              >
                <Show when={loading()}>Loading...</Show>
                <Show when={!loading()}>Continue Conversation</Show>
              </button>
              <button
                class="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                onClick={handleEndConversation}
                disabled={loading()}
              >
                End Conversation
              </button>
            </div>
          </Show>
          <form class="flex items-center mt-4" onSubmit={handleUserInput}>
            <input
              class="flex-1 px-4 py-2 border rounded box-border"
              type="text"
              placeholder={`Type your reply in ${language()}`}
              value={userInput()}
              onInput={(e) => setUserInput(e.target.value)}
              disabled={loading() || showContinueOption()}
            />
            <button
              type="submit"
              class="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer"
              disabled={loading() || showContinueOption()}
            >
              <Show when={loading()}>Wait...</Show>
              <Show when={!loading()}>Send</Show>
            </button>
          </form>
        </div>
      </Show>
    </div>
  )
}

export default App