export default function renderLanding() {
  document.getElementById('app').innerHTML = `
    <main class="landing-page">
      <h1>Welcome to SPECS</h1>
      <p>Student Projects, Events, and Collaboration.</p>
      <button id="start-btn">Get Started</button>
    </main>
  `;

  document.getElementById('start-btn').addEventListener('click', () => {
    location.hash = '#login';
  });
}
