import { useState, useEffect } from 'react'
import VideoCall from './VideoCall'

function App() {
  const [userName, setUserName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)

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
    alert('Meeting link copied to clipboard!')
  }

  if (joined) {
    return <VideoCall roomId={roomId} userName={userName} />
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#202124] text-white">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-gradient-to-br from-[#1a73e8] to-[#174ea6]">
        <div className="max-w-md">
          <div className="mb-8">
            <div className="bg-white/20 backdrop-blur-lg p-6 rounded-3xl inline-block">
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-4">
            Premium video meetings.<br />Now free for everyone.
          </h1>

          <p className="text-xl text-white/90 mb-8">
            We re-engineered the service that we built for secure business meetings to make it free and available for all.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Get a link you can share</h3>
                <p className="text-white/80 text-sm">Click "New meeting" to get a link you can send to people you want to meet with</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your meeting is safe</h3>
                <p className="text-white/80 text-sm">No one can join a meeting unless invited or admitted by the host</p>
              </div>
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
            <p className="text-xs text-[#9aa0a6] text-center">
              By joining, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
