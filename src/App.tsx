import { useState, useEffect } from 'react'
import VideoCall from './VideoCall'
import { ToastProvider, useToast } from './components/ui/Toast'

function AppContent() {
  const [userName, setUserName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const { showToast } = useToast()

  // Check if URL has room ID (like Google Meet)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const roomFromUrl = urlParams.get('room')
    if (roomFromUrl) {
      setRoomId(roomFromUrl)
    }
  }, [])

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      if (!roomId.trim()) {
        // Create new room if no room ID
        const newRoomId = generateRoomId()
        setRoomId(newRoomId)
        // Update URL
        window.history.pushState({}, '', `?room=${newRoomId}`)
      }
      setJoined(true)
    }
  }

  const generateRoomId = () => {
    // Generate a random room ID (like Google Meet: xxx-xxxx-xxx)
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${part1}-${part2}-${part3}`
  }

  const createNewMeeting = () => {
    setIsCreatingRoom(true)
    const newRoomId = generateRoomId()
    setRoomId(newRoomId)
    window.history.pushState({}, '', `?room=${newRoomId}`)
  }

  const copyMeetingLink = () => {
    const link = `${window.location.origin}?room=${roomId}`
    navigator.clipboard.writeText(link)
    showToast('Meeting link copied to clipboard!', 'success')
  }

  if (joined) {
    return <VideoCall roomId={roomId} userName={userName} />
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#202124] text-white">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#1a73e8] to-[#174ea6] relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-blue-300 blur-3xl"></div>
        </div>

        {/* Header/Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-semibold tracking-tight">VidMeet Premium</span>
          </div>

          <h1 className="text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Premium video meetings.<br />
            <span className="text-blue-200">Now free for everyone.</span>
          </h1>

          <p className="text-xl text-blue-100 max-w-lg leading-relaxed">
            We re-engineered the service that we built for secure business meetings to make it free and available for all.
          </p>
        </div>

        {/* Features List */}
        <div className="relative z-10 grid gap-8 mt-12">
          <div className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:bg-white/10">
            <div className="bg-white/20 p-3 rounded-xl border border-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Get a link you can share</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                Click <span className="font-semibold text-white">"New meeting"</span> to get a link you can send to people you want to meet with.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:bg-white/10">
            <div className="bg-white/20 p-3 rounded-xl border border-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Your meeting is safe</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                No one can join a meeting unless invited or admitted by the host.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Join/Create */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 bg-[#2d2e30] px-6 py-3 rounded-2xl">
              <svg className="w-8 h-8 text-[#1a73e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-2xl font-bold">VidMeet</span>
            </div>
          </div>

          <h2 className="text-3xl font-medium mb-2 text-center lg:text-left">
            {isCreatingRoom ? 'Your meeting is ready' : 'Get started'}
          </h2>
          <p className="text-[#9aa0a6] mb-8 text-center lg:text-left">
            {isCreatingRoom ? 'Share this link with others you want in the meeting' : 'Create a new meeting or join an existing one'}
          </p>

          {/* Meeting Link Display (when creating) */}
          {isCreatingRoom && roomId && (
            <div className="mb-6 bg-[#2d2e30] rounded-xl p-4 border border-[#3c4043]">
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono text-sm text-[#e8eaed] truncate">
                  {window.location.origin}?room={roomId}
                </div>
                <button
                  onClick={copyMeetingLink}
                  className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleJoinRoom} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-[#e8eaed] mb-2">
                Your name
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-[#2d2e30] border border-[#3c4043] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent text-white placeholder-[#9aa0a6] transition-all"
                required
                maxLength={30}
              />
            </div>

            {/* Room ID Input (only if not creating new) */}
            {!isCreatingRoom && (
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-[#e8eaed] mb-2">
                  Meeting code (optional)
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toLowerCase().replace(/[^a-z-]/g, ''))}
                  placeholder="abc-defg-hij"
                  className="w-full px-4 py-3 bg-[#2d2e30] border border-[#3c4043] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent text-white placeholder-[#9aa0a6] font-mono transition-all"
                  maxLength={20}
                />
                <p className="mt-2 text-xs text-[#9aa0a6]">
                  Enter a code or leave blank to create a new meeting
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isCreatingRoom ? (
                <>
                  <button
                    type="button"
                    onClick={createNewMeeting}
                    className="w-full px-6 py-3 bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    New meeting
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#3c4043]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[#202124] text-[#9aa0a6]">or</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-[#2d2e30] hover:bg-[#3c4043] border border-[#3c4043] rounded-lg font-medium transition-all"
                  >
                    Join meeting
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg font-medium transition-all"
                >
                  Join now
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#3c4043]">
            <p className="text-xs text-[#9aa0a6] text-center mb-8">
              By joining, you agree to our Terms of Service and Privacy Policy
            </p>

            {/* Developer Section */}
            <div className="flex items-center justify-center gap-4 bg-[#2d2e30]/50 p-4 rounded-xl border border-[#3c4043]/50 hover:bg-[#2d2e30] transition-colors">
              <img
                src="https://github.com/Manish-keer19.png"
                alt="Manish Keer"
                className="w-12 h-12 rounded-full border-2 border-[#1a73e8]"
              />
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">Manish Keer</span>
                <span className="text-xs text-[#1a73e8] font-medium">Software Engineer</span>
                <a
                  href="https://github.com/Manish-keer19"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#9aa0a6] hover:text-white flex items-center gap-1 mt-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  github.com/Manish-keer19
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
