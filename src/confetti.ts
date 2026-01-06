export function confettiBurst(): void {
    const colors = ['#e85d4c', '#3bbf9e', '#5a8fd8', '#f5a623', '#e056fd'];
    const container = document.body;

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = 2 + Math.random() * 2 + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4000);
    }
}
