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
    <div class="min-h-screen flex flex-col">
      <Show when={currentPage() === 'landingPage'}>
        <div class="flex-1">
          <header class="fixed w-full bg-white bg-opacity-90 backdrop-filter backdrop-blur-lg z-50">
            <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
              <h1 class="text-3xl font-bold text-blue-600">Language Play</h1>
              <nav class="hidden md:flex space-x-8">
                <a href="#features" class="text-gray-800 hover:text-blue-600 cursor-pointer">Features</a>
                <a href="#how-it-works" class="text-gray-800 hover:text-blue-600 cursor-pointer">How It Works</a>
                <a href="#testimonials" class="text-gray-800 hover:text-blue-600 cursor-pointer">Testimonials</a>
                <a href="#faq" class="text-gray-800 hover:text-blue-600 cursor-pointer">FAQ</a>
              </nav>
              <button
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                onClick={handleGetStarted}
              >
                Get Started
              </button>
            </div>
          </header>
          <main class="mt-16">
            <section class="relative bg-cover bg-center h-screen" style="background-image: url('/assets/language-hero.jpg');">
              <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-75"></div>
              <div class="relative z-10 max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center text-white px-4">
                <h2 class="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in">Learn Languages Through Conversation</h2>
                <p class="text-xl md:text-2xl mb-8 animate-fade-in">Immerse yourself in real-life scenarios and improve your language skills with personalized AI feedback.</p>
                <div class="space-x-4">
                  <button
                    class="px-6 py-3 bg-white text-blue-600 rounded hover:bg-gray-200 cursor-pointer"
                    onClick={handleGetStarted}
                  >
                    Get Started
                  </button>
                  <button
                    class="px-6 py-3 bg-transparent border border-white rounded hover:bg-white hover:text-blue-600 cursor-pointer"
                    onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </section>
            <section id="features" class="max-w-7xl mx-auto py-16 px-4">
              <h2 class="text-4xl font-bold mb-8 text-center text-blue-600">Features</h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="p-6 bg-gray-50 rounded-lg shadow text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <img src="/assets/conversation.svg" alt="Interactive Conversations" class="mx-auto mb-4 h-24" />
                  <h3 class="text-2xl font-semibold mb-4">Interactive Conversations</h3>
                  <p>Engage in dialogues that mimic real-life situations to practice and enhance your speaking skills.</p>
                </div>
                <div class="p-6 bg-gray-50 rounded-lg shadow text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <img src="/assets/feedback.svg" alt="Personalized AI Feedback" class="mx-auto mb-4 h-24" />
                  <h3 class="text-2xl font-semibold mb-4">Personalized AI Feedback</h3>
                  <p>Receive instant evaluations and constructive feedback tailored to your responses.</p>
                </div>
                <div class="p-6 bg-gray-50 rounded-lg shadow text-center hover:shadow-lg transition-shadow cursor-pointer">
                  <img src="/assets/languages.svg" alt="Multiple Language Support" class="mx-auto mb-4 h-24" />
                  <h3 class="text-2xl font-semibold mb-4">Multiple Language Support</h3>
                  <p>Choose from a wide range of languages to learn and improve at your own pace.</p>
                </div>
              </div>
            </section>
            <section id="how-it-works" class="max-w-7xl mx-auto py-16 px-4 bg-gray-100">
              <h2 class="text-4xl font-bold mb-8 text-center text-blue-600">How It Works</h2>
              <ol class="space-y-4 text-lg">
                <li><strong>Sign In:</strong> Create an account or sign in using your preferred method.</li>
                <li><strong>Select a Language:</strong> Choose the language you want to learn.</li>
                <li><strong>Start Conversing:</strong> Engage in conversations based on real-life scenarios.</li>
                <li><strong>Receive Feedback:</strong> Get instant feedback to improve your language skills.</li>
                <li><strong>Practice Anytime:</strong> Resume conversations anytime, anywhere.</li>
              </ol>
            </section>
            <section id="testimonials" class="max-w-7xl mx-auto py-16 px-4">
              <h2 class="text-4xl font-bold mb-8 text-center text-blue-600">Testimonials</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="p-6 bg-gray-50 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                  <div class="flex items-center mb-4">
                    <img src="/assets/user1.jpg" alt="Alex" class="h-12 w-12 rounded-full" />
                    <p class="ml-4 text-xl font-semibold">Alex T.</p>
                  </div>
                  <p class="text-xl italic">"Language Play has revolutionized the way I practice French. The conversations feel so real!"</p>
                </div>
                <div class="p-6 bg-gray-50 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
                  <div class="flex items-center mb-4">
                    <img src="/assets/user2.jpg" alt="Maria" class="h-12 w-12 rounded-full" />
                    <p class="ml-4 text-xl font-semibold">Maria S.</p>
                  </div>
                  <p class="text-xl italic">"The instant feedback helps me correct mistakes immediately. Highly recommended!"</p>
                </div>
              </div>
            </section>
            <section id="faq" class="max-w-7xl mx-auto py-16 px-4 bg-gray-100">
              <h2 class="text-4xl font-bold mb-8 text-center text-blue-600">Frequently Asked Questions</h2>
              <div class="space-y-4">
                <details class="p-4 bg-white rounded-lg shadow cursor-pointer">
                  <summary class="font-semibold">Which languages are supported?</summary>
                  <p class="mt-2 text-gray-700">Language Play supports a wide range of languages. You can choose any language you wish to learn.</p>
                </details>
                <details class="p-4 bg-white rounded-lg shadow cursor-pointer">
                  <summary class="font-semibold">Is there a cost to use the app?</summary>
                  <p class="mt-2 text-gray-700">Language Play is currently free to use for all users.</p>
                </details>
                <details class="p-4 bg-white rounded-lg shadow cursor-pointer">
                  <summary class="font-semibold">How is my data protected?</summary>
                  <p class="mt-2 text-gray-700">We prioritize your privacy and use secure authentication methods. Your data is stored safely.</p>
                </details>
              </div>
            </section>
          </main>
          <footer class="bg-gray-800 text-white py-8">
            <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
              <p class="text-center md:text-left">&copy; 2023 Language Play. All rights reserved.</p>
              <div class="flex space-x-4 mt-4 md:mt-0">
                <a href="#" class="hover:text-blue-400 cursor-pointer">Contact Us</a>
                <a href="#" class="hover:text-blue-400 cursor-pointer">Privacy Policy</a>
                <a href="#" class="hover:text-blue-400 cursor-pointer">Terms of Service</a>
              </div>
            </div>
          </footer>
        </div>
      </Show>

      <Show when={currentPage() === 'login'}>
        <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
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
        </div>
      </Show>

      <Show when={currentPage() === 'languageSelection'}>
        <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
          <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h2 class="text-2xl font-bold mb-4 text-center">Select Language to Learn</h2>
            <form onSubmit={handleLanguageSelection}>
              <input
                class="w-full px-4 py-2 mb-4 border rounded box-border text-gray-800"
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
        </div>
      </Show>

      <Show when={currentPage() === 'conversation'}>
        <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
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
                class="flex-1 px-4 py-2 border rounded box-border text-gray-800"
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
        </div>
      </Show>
    </div>
  )
}

export default App