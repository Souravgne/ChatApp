import { useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { connectWS } from './ws';

export default function App() {
    const timer = useRef(null);
    const socket = useRef(null);

    const [userName, setUserName] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [inputName, setInputName] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [formError, setFormError] = useState('');
    const [usersInRoom, setUsersInRoom] = useState([]);
    const fileInputRef = useRef(null);



    const [showNamePopup, setShowNamePopup] = useState(true);

    const [typers, setTypers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');

    useEffect(() => {
        socket.current = connectWS();

        socket.current.on('connect', () => {
            // Room join announcement
            socket.current.on('roomNotice', (joinedUser) => {
                console.log(`${joinedUser} joined the chat!`);
                toast.success(`${joinedUser} joined the chat!`);
            });

            // Receive message
            socket.current.on('chatMessage', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            // Typing indicators
            socket.current.on('typing', (typingUser) => {
                setTypers((prev) =>
                    prev.includes(typingUser) ? prev : [...prev, typingUser]
                );
            });

            socket.current.on('stopTyping', (typingUser) => {
                setTypers((prev) => prev.filter((u) => u !== typingUser));
            });

            socket.current.on('roomUsers', (users) => {
                console.log(users)
            setUsersInRoom(users); // Expects array of usernames
            });

        });

        return () => {
            socket.current.off('roomNotice');
            socket.current.off('chatMessage');
            socket.current.off('typing');
            socket.current.off('stopTyping');
        };
    }, []);

    // Typing detection
    useEffect(() => {
        if (text) {
            socket.current.emit('typing', userName);
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => {
            socket.current.emit('stopTyping', userName);
        }, 1000);

        return () => clearTimeout(timer.current);
    }, [text, userName]);

    function formatTime(ts) {
        const d = new Date(ts);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    function handleNameSubmit(e) {
        e.preventDefault();

        const trimmedName = inputName.trim();
        const trimmedCode = inputCode.trim();

        if (!trimmedName || !trimmedCode) {
            setFormError('Both fields are required.');
            return;
        }

        setFormError('');
        setUserName(trimmedName);
        setAccessCode(trimmedCode);

        socket.current.emit('joinRoom', {
            userName: trimmedName,
            accessCode: trimmedCode,
        });

        setShowNamePopup(false);
    }

    function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed) return;

        const msg = {
            id: Date.now(),
            sender: userName,
            text: trimmed,
            ts: Date.now(),
        };

        setMessages((m) => [...m, msg]);
        socket.current.emit('chatMessage', msg);
        setText('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { // 2 MB
    toast.error("File too large (max 2MB)");
    return;
}   
    if(file.type == "video/mp4"){
        toast.error("Can't Send video file");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
        const fileMsg = {
            id: Date.now(),
            sender: userName,
            ts: Date.now(),
            file: {
                name: file.name,
                type: file.type,
                data: reader.result, // base64 string
            },
        };
        setMessages((m) => [...m, fileMsg]);
        socket.current.emit('chatMessage', fileMsg);
    };
    reader.readAsDataURL(file); // base64 encoding
}

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4 font-inter">
            <Toaster position="top-right" reverseOrder={false} />

            {/* Name & Code Input */}
            {showNamePopup && (
                <div className="fixed inset-0 flex items-center justify-center z-40">
                    <div className="bg-white rounded-xl shadow-lg max-w-md p-6 w-full">
                        <h1 className="text-xl font-semibold text-black">Enter your name</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Enter your name and access code to join the chat.
                        </p>
                        <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
                            <input
                                autoFocus
                                value={inputName}
                                onChange={(e) => setInputName(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 outline-green-500 placeholder-gray-400"
                                placeholder="Your name"
                            />
                            <input
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 outline-green-500 placeholder-gray-400"
                                placeholder="Access Code"
                            />
                            {formError && (
                                <div className="text-red-500 text-sm font-medium">{formError}</div>
                            )}
                            <button
                                type="submit"
                                className="block ml-auto mt-3 px-4 py-1.5 rounded-full bg-green-500 text-white font-medium cursor-pointer">
                                Continue
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat UI */}
            {!showNamePopup && (
                <div className="w-full max-w-2xl h-[90vh] bg-white rounded-xl shadow-md flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                        <div className="h-10 w-10 rounded-full bg-[#075E54] flex items-center justify-center text-white font-semibold">
                            {userName[0]}
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-[#303030]">
                                Group chat
                            </div>
                            {typers.length > 0 && (
                               <div className="text-xs text-gray-500 flex items-center gap-1">
    <span>{typers.join(', ')} is</span>
    <span className="flex items-center gap-1 text-green-500">
        typing...
    </span>
</div>

                            )}
                        </div>
                        <div className="text-sm text-gray-500">
                            Signed in as{' '}
                            <span className="font-medium text-[#303030] capitalize">
                                {userName}
                            </span>
                        </div>
                    </div>
                            {/* Members List */}
                    <div className="border-b border-gray-200 px-4 py-2 bg-white">
                        <div className="font-medium text-sm text-[#303030] mb-1">Members</div>
                        <div className="flex flex-wrap gap-2">
                            {usersInRoom.map((user) => {
                                const isTyping = typers.includes(user);
                                return (
                                    <div
                                        key={user}
                                        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-700"
                                    >
                                        <span className="font-medium">{user}</span>
                                        {isTyping && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                    )}

                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-100 flex flex-col">
                        {messages.map((m) => {
    const mine = m.sender === userName;
    return (
        <div
            key={m.id}
            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[78%] p-3 my-2 rounded-[18px] text-sm leading-5 shadow-sm ${
                    mine
                        ? 'bg-[#DCF8C6] text-[#303030] rounded-br-2xl'
                        : 'bg-white text-[#303030] rounded-bl-2xl'
                }`}>
                {/* TEXT Message */}
                {m.text && (
                    <div className="break-words whitespace-pre-wrap">{m.text}</div>
                )}

                {/* FILE Message */}
                {m.file && (
                    <div>
                        {m.file.type.startsWith('image/') ? (
                            <img
                                src={m.file.data}
                                alt={m.file.name}
                                className="rounded-md max-w-xs max-h-64"
                            />
                        ) : (
                            <a
                                href={m.file.data}
                                download={m.file.name}
                                className="text-blue-600 underline"
                            >
                                Download {m.file.name}
                            </a>
                        )}
                    </div>
                )}

                <div className="flex justify-between items-center mt-1 gap-16">
                    <div className="text-[11px] font-bold">{m.sender}</div>
                    <div className="text-[11px] text-gray-500 text-right">
                        {formatTime(m.ts)}
                    </div>
                </div>
            </div>
        </div>
    );
})}

                    </div>

                    {/* Input */}
                    <div className="px-4 py-3 border-t border-gray-200 bg-white">
                        
                        <div className="flex items-center justify-between gap-4 border border-gray-200 rounded-full">
                            <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="bg-gray-200 text-gray-800 px-3 py-2 rounded-full text-sm font-medium"
                    >
                        📎
                    </button>

                            <textarea
                                rows={1}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="w-full resize-none px-4 py-4 text-sm outline-none"
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-green-500 text-white px-4 py-2 mr-2 rounded-full text-sm font-medium cursor-pointer">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
