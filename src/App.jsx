import { createSignal, createEffect, onMount, Show, For } from 'solid-js'
import { supabase, createEvent } from './supabaseClient'
import { Auth } from '@supabase/auth-ui-solid'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { SolidMarkdown } from "solid-markdown"

function App() {
  const [user, setUser] = createSignal(null)
  const [currentPage, setCurrentPage] = createSignal('login')
  const [loading, setLoading] = createSignal(false)
  const [language, setLanguage] = createSignal('')
  const [conversation, setConversation] = createSignal([])
  const [userInput, setUserInput] = createSignal('')
  const [feedback, setFeedback] = createSignal('')
  const [showContinueOption, setShowContinueOption] = createSignal(false)

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setCurrentPage('languageSelection')
    }
  }

  onMount(checkUserSignedIn)

  createEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        setCurrentPage('languageSelection')
      } else {
        setUser(null)
        setCurrentPage('login')
      }
    })

    return () => {
      authListener.data.unsubscribe()
    }
  })

  const handleLanguageSelection = async (e) => {
    e.preventDefault()
    if (language().trim() === '') return
    setLoading(true)
    try {
      const prompt = `Pretend to be a person speaking the ${language()} language. Start a conversation with the user in ${language()} by creating a scenario involving two individuals, where the user is one of them. Speak only in ${language()}.`
      const response = await createEvent('chatgpt_request', {
        prompt: prompt,
        response_type: 'text'
      })
      setConversation([{ sender: 'AI', message: response }])
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
    setUserInput('')
    setFeedback('')
    setShowContinueOption(false)
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
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