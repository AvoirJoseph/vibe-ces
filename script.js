document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const configSection = document.getElementById('configSection');
    const timerSection = document.getElementById('timerSection');
    const minTimeInput = document.getElementById('minTime');
    const maxTimeInput = document.getElementById('maxTime');
    const hideTimerToggle = document.getElementById('hideTimer');
    const autoRestartToggle = document.getElementById('autoRestart');
    const pomodoroModeToggle = document.getElementById('pomodoroMode');
    const breakTimeGroup = document.getElementById('breakTimeGroup');
    const breakMinTimeInput = document.getElementById('breakMinTime');
    const breakMaxTimeInput = document.getElementById('breakMaxTime');
    const chimeSelect = document.getElementById('chimeSelect');
    const volumeSlider = document.getElementById('volumeSlider');

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const testSoundBtn = document.getElementById('testSoundBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyList = document.getElementById('historyList');
    const previewChimeBtn = document.getElementById('previewChimeBtn');

    const timeDisplay = document.getElementById('timeDisplay');
    const hiddenMessage = document.getElementById('hiddenMessage');
    const breathingCircle = document.getElementById('breathingCircle');
    const progressRing = document.getElementById('progressRing');

    // Notes Panel Elements
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const customMessage = document.getElementById('customMessage');

    // Random Rotating Messages for Bulletin Note
    const sweetMessages = [
        "You're doing great, bb! 💚 - (dont know what you call me)",
        "Don't forget to drink water! 💧 - (dont know what you call me)",
        "Chill ka lang. You got this! ✨ - (dont know what you call me)",
        "Always here for you if you need anything!!! - (dont know what you call me)",
        "One step at a time! 🐢 - (dont know what you call me)",
        "Ayusin mo naman sleep sched mo pls lang - (dont know what you call me)",
        "Sana masarap ulam niyo mamaya - (dont know what you call me)",
        "Don't forget to take a break! 🚀 - (dont know what you call me)"
    ];

    if (customMessage) {
        customMessage.textContent = sweetMessages[Math.floor(Math.random() * sweetMessages.length)];
    }

    // SVG Progress Bar Math
    const circleRadius = progressRing.r.baseVal.value;
    const circumference = circleRadius * 2 * Math.PI;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
    progressRing.style.strokeDashoffset = circumference; // Start fully hidden? Or full? Let's say full is offset 0

    let timerInterval;
    let endTime;
    let startTime; // Keep track of when timer began to calculate percentage
    let totalDurationMs;
    let isRunning = false;
    let isWaitingForRestart = false;
    let sessionHistory = [];
    let tasksInfo = [];
    let isDarkMode = false;
    let currentPhase = 'work'; // 'work' or 'break'

    // Load preferences from local storage
    const loadPrefs = () => {
        const prefs = JSON.parse(localStorage.getItem('cescaTimerPrefs')) || {};
        if (prefs.minTime) minTimeInput.value = prefs.minTime;
        if (prefs.maxTime) maxTimeInput.value = prefs.maxTime;
        if (prefs.hideTimer !== undefined) hideTimerToggle.checked = prefs.hideTimer;
        if (prefs.autoRestart !== undefined) autoRestartToggle.checked = prefs.autoRestart;
        if (prefs.pomodoroMode !== undefined) pomodoroModeToggle.checked = prefs.pomodoroMode;
        if (prefs.breakMinTime) breakMinTimeInput.value = prefs.breakMinTime;
        if (prefs.breakMaxTime) breakMaxTimeInput.value = prefs.breakMaxTime;

        if (pomodoroModeToggle.checked) {
            breakTimeGroup.classList.remove('hidden');
        } else {
            breakTimeGroup.classList.add('hidden');
        }
        if (prefs.volume) volumeSlider.value = prefs.volume;
        if (prefs.chime) chimeSelect.value = prefs.chime;
        if (prefs.darkMode) {
            isDarkMode = prefs.darkMode;
            if (isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');
        }
        if (prefs.history) sessionHistory = prefs.history;
        if (prefs.tasks) {
            tasksInfo = prefs.tasks;
            renderTasks();
        }
    };

    const savePrefs = () => {
        localStorage.setItem('cescaTimerPrefs', JSON.stringify({
            minTime: minTimeInput.value,
            maxTime: maxTimeInput.value,
            hideTimer: hideTimerToggle.checked,
            autoRestart: autoRestartToggle.checked,
            pomodoroMode: pomodoroModeToggle.checked,
            breakMinTime: breakMinTimeInput.value,
            breakMaxTime: breakMaxTimeInput.value,
            volume: volumeSlider.value,
            chime: chimeSelect.value,
            darkMode: isDarkMode,
            history: sessionHistory.slice(0, 50), // Keep last 50
            tasks: tasksInfo // Save tasks
        }));
    };

    loadPrefs();

    // Sound Generation
    const playChime = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const now = ctx.currentTime;
            const volume = parseFloat(volumeSlider.value);
            const chimeType = chimeSelect.value;

            const masterGain = ctx.createGain();
            masterGain.gain.value = volume;
            masterGain.connect(ctx.destination);

            const playNote = (frequency, startTime, duration, vol, type) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(frequency, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(gain);
                gain.connect(masterGain);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            if (chimeType === 'bell') {
                playNote(523.25, now, 2.0, 0.4, 'triangle');       // C5
                playNote(659.25, now + 0.15, 2.0, 0.4, 'triangle'); // E5
                playNote(783.99, now + 0.3, 2.0, 0.4, 'triangle'); // G5
                playNote(1046.50, now + 0.5, 3.0, 0.5, 'triangle'); // C6
            } else if (chimeType === 'marimba') {
                playNote(392.00, now, 1.0, 0.6, 'sine');       // G4
                playNote(493.88, now + 0.1, 1.0, 0.6, 'sine'); // B4
                playNote(587.33, now + 0.2, 1.0, 0.6, 'sine'); // D5
                playNote(783.99, now + 0.4, 2.0, 0.7, 'sine'); // G5
            } else if (chimeType === 'synth') {
                playNote(440.00, now, 1.5, 0.3, 'square');       // A4
                playNote(554.37, now + 0.2, 1.5, 0.3, 'square'); // C#5
                playNote(659.25, now + 0.4, 1.5, 0.3, 'square'); // E5
                playNote(880.00, now + 0.6, 2.5, 0.4, 'square'); // A5
            }

        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    testSoundBtn.addEventListener('click', () => {
        playChime();
        // Visual feedback
        breathingCircle.style.transform = 'scale(1.1)';
        setTimeout(() => {
            breathingCircle.style.transform = '';
        }, 150);
    });

    // Formatter for MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate a random duration strictly between min and max (in milliseconds)
    const getRandomDuration = (minMinutes, maxMinutes) => {
        const minMs = parseFloat(minMinutes) * 60 * 1000;
        const maxMs = parseFloat(maxMinutes) * 60 * 1000;
        if (minMs >= maxMs) return minMs;
        return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    };

    // UI Tick Update
    const updateDisplay = () => {
        if (!isRunning) return;

        const now = Date.now();
        const remainingStr = Math.max(0, endTime - now);
        const remainingSec = Math.ceil(remainingStr / 1000);

        // Progress Ring Calculation
        const fraction = Math.max(0, remainingStr / totalDurationMs);
        const offset = circumference - (fraction * circumference);
        progressRing.style.strokeDashoffset = offset;

        // Dynamic Ring Color (Green to Orange to Red)
        if (fraction > 0.5) {
            progressRing.style.stroke = "white";
        } else if (fraction > 0.2) {
            progressRing.style.stroke = currentPhase === 'break' ? "#81ecec" : "#f9ca24"; // Yellow (work) or light blue (break)
        } else {
            progressRing.style.stroke = currentPhase === 'break' ? "#0984e3" : "#eb4d4b"; // Red (work) or solid blue (break)
        }

        if (hideTimerToggle.checked) {
            timeDisplay.classList.add('hidden');
            hiddenMessage.classList.remove('hidden');

            // Animate growing dots
            const dots = '.'.repeat((Math.floor(now / 500) % 3) + 1);
            hiddenMessage.textContent = 'Growing' + dots;
        } else {
            hiddenMessage.classList.add('hidden');
            timeDisplay.classList.remove('hidden');
            timeDisplay.textContent = formatTime(remainingSec);
        }

        if (remainingStr <= 0) {
            timerFinished();
        }
    };

    // Start Timer Logic
    const startTimer = () => {
        savePrefs();

        let min, max;
        if (currentPhase === 'work') {
            min = parseFloat(minTimeInput.value);
            max = parseFloat(maxTimeInput.value);
            if (isNaN(min) || isNaN(max) || min <= 0) { min = 1; max = 5; }
            if (min > max) { minTimeInput.value = max; maxTimeInput.value = min;[min, max] = [max, min]; }
        } else {
            min = parseFloat(breakMinTimeInput.value);
            max = parseFloat(breakMaxTimeInput.value);
            if (isNaN(min) || isNaN(max) || min <= 0) { min = 1; max = 5; }
            if (min > max) { breakMinTimeInput.value = max; breakMaxTimeInput.value = min;[min, max] = [max, min]; }
        }

        const durationMs = getRandomDuration(min, max);
        totalDurationMs = durationMs;
        startTime = Date.now();
        endTime = startTime + durationMs;
        isRunning = true;
        isWaitingForRestart = false;

        configSection.classList.add('hidden');
        timerSection.classList.remove('hidden');

        // Reset styles if restarted
        if (currentPhase === 'work') {
            breathingCircle.style.background = 'linear-gradient(135deg, var(--sage-300), var(--sage-400))';
        } else {
            breathingCircle.style.background = 'linear-gradient(135deg, #74b9ff, #0984e3)'; // Blue tone for break
        }
        progressRing.style.strokeDashoffset = 0; // Starts full
        progressRing.style.stroke = "white";

        // Play an imperceptible beep to unlock AudioContext on mobile/strict-browsers
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.001;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.01);
        } catch (e) { }

        updateDisplay();
        timerInterval = setInterval(updateDisplay, 200);
    };

    // Manual Stop/Cancel
    const stopTimer = () => {
        isRunning = false;
        clearInterval(timerInterval);
        timerSection.classList.add('hidden');
        configSection.classList.remove('hidden');
        timeDisplay.textContent = '--:--';
        isWaitingForRestart = false;
        currentPhase = 'work';
    };

    // Timer Natural Finish
    const timerFinished = () => {
        isRunning = false;
        clearInterval(timerInterval);

        playChime();

        // Visual indicator that it popped
        if (currentPhase === 'work') {
            breathingCircle.style.background = 'linear-gradient(135deg, var(--sage-400), var(--sage-600))';
        } else {
            breathingCircle.style.background = 'linear-gradient(135deg, #0984e3, #00cec9)';
        }
        progressRing.style.strokeDashoffset = 0; // Snap to full
        progressRing.style.stroke = "var(--sage-200)";
        hiddenMessage.textContent = 'Ping! 🌱';
        timeDisplay.textContent = '00:00';

        // Log history ONLY for work sessions
        if (currentPhase === 'work') {
            const date = new Date();
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            sessionHistory.unshift({ time: timeString, duration: totalDurationMs / 1000, type: 'Work' });
            savePrefs();
        }

        // Pomodoro Shift Phase
        if (pomodoroModeToggle.checked) {
            currentPhase = currentPhase === 'work' ? 'break' : 'work';
        } else {
            currentPhase = 'work'; // fallback
        }

        if (autoRestartToggle.checked || pomodoroModeToggle.checked) {
            isWaitingForRestart = true;
            // Short 3-second delay to enjoy the ping before starting the next random interval
            setTimeout(() => {
                if (isWaitingForRestart) {
                    startTimer();
                }
            }, 3000);
        } else {
            // Wait 3 seconds then return to menu
            setTimeout(() => {
                if (!isRunning && !isWaitingForRestart) {
                    stopTimer();
                }
            }, 3000);
        }
    };

    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);

    // Auto-correct min/max logic to ensure min <= max
    minTimeInput.addEventListener('blur', () => {
        if (parseFloat(minTimeInput.value) > parseFloat(maxTimeInput.value)) {
            maxTimeInput.value = minTimeInput.value;
        }
    });
    maxTimeInput.addEventListener('blur', () => {
        if (parseFloat(minTimeInput.value) > parseFloat(maxTimeInput.value)) {
            minTimeInput.value = maxTimeInput.value;
        }
    });

    // UI Interactions
    pomodoroModeToggle.addEventListener('change', () => {
        if (pomodoroModeToggle.checked) {
            breakTimeGroup.classList.remove('hidden');
        } else {
            breakTimeGroup.classList.add('hidden');
        }
        savePrefs();
    });

    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        savePrefs();
    });

    historyToggleBtn.addEventListener('click', () => {
        configSection.classList.add('hidden');
        historySection.classList.remove('hidden');

        historyList.innerHTML = '';
        if (sessionHistory.length === 0) {
            historyList.innerHTML = '<li style="text-align:center; color: var(--text-muted)">No sessions yet.</li>';
        } else {
            sessionHistory.forEach(item => {
                const li = document.createElement('li');
                li.className = 'history-item';
                const kind = item.type === 'Work' ? '💼' : '';
                li.innerHTML = `
                    <span class="history-item-date">${item.time} ${kind}</span>
                    <span class="history-item-dur">${formatTime(item.duration)}</span>
                `;
                historyList.appendChild(li);
            });
        }
    });

    closeHistoryBtn.addEventListener('click', () => {
        historySection.classList.add('hidden');
        configSection.classList.remove('hidden');
    });

    previewChimeBtn.addEventListener('click', playChime);

    volumeSlider.addEventListener('change', savePrefs);
    chimeSelect.addEventListener('change', savePrefs);

    // Tasks Logic
    function renderTasks() {
        taskList.innerHTML = '';
        if (tasksInfo.length === 0) {
            taskList.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding-top: 20px;">No tasks right now.<br>You got this! 🌱</li>';
            return;
        }

        tasksInfo.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-task-btn" title="Delete Task">×</button>
            `;

            // Toggle completed
            const checkbox = li.querySelector('.task-checkbox');
            const textSpan = li.querySelector('.task-text');
            const toggleCompletion = () => {
                tasksInfo[index].completed = !tasksInfo[index].completed;
                savePrefs();
                renderTasks();
            };
            checkbox.addEventListener('change', toggleCompletion);
            textSpan.addEventListener('click', toggleCompletion);

            // Delete task
            const deleteBtn = li.querySelector('.delete-task-btn');
            deleteBtn.addEventListener('click', () => {
                tasksInfo.splice(index, 1);
                savePrefs();
                renderTasks();
            });

            taskList.appendChild(li);
        });
    };

    const addNewTask = () => {
        const text = taskInput.value.trim();
        if (!text) return;

        tasksInfo.push({ text: text, completed: false });
        taskInput.value = '';
        savePrefs();
        renderTasks();
    };

    addTaskBtn.addEventListener('click', addNewTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addNewTask();
        }
    });

    // Parallax Effect
    const leaves = document.querySelectorAll('.leaf');
    document.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 40;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 40;

        leaves.forEach((leaf, idx) => {
            const speed = (idx + 1) * 1.5;
            // Add a subtle rotation based on position
            leaf.style.transform = `translate(${xAxis * speed}px, ${yAxis * speed}px) rotate(${xAxis * 1.5}deg)`;
        });
    });

    // Make sure interaction is registered for AudioContext rules
    document.body.addEventListener('click', () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
        } catch (e) { }
    }, { once: true });
});
