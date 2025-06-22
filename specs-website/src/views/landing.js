export default function renderLanding() {
  document.getElementById('app').innerHTML = `
    <style>
      .landing-page {
        /* Full-screen container */
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        padding: 2rem;
        box-sizing: border-box;

        /* Modern background gradient */
        color: white;
        text-align: center;
        overflow: hidden; /* Prevents scrollbars from animations */
      }

      .hero-content {
        max-width: 800px;
      }

      .hero-content h1 {
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 1rem;
        text-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        
        /* Set initial state for animation */
        opacity: 0;
        transform: translateY(30px);
        animation: fadeInUp 0.8s ease-out forwards;
      }

      .hero-content p {
        font-size: 1.25rem;
        margin-bottom: 2.5rem;
        color: rgba(255, 255, 255, 0.8);

        /* Set initial state for animation with a delay */
        opacity: 0;
        transform: translateY(30px);
        animation: fadeInUp 0.8s 0.3s ease-out forwards;
      }

      #start-btn {
        font-size: 1.1rem;
        font-weight: bold;
        padding: 0.8rem 2.5rem;
        border: none;
        border-radius: 50px; /* Pill-shaped button */
        color: white;
        background-color: #007bff;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 123, 255, 0.3);

        /* Set initial state for animation with a longer delay */
        opacity: 0;
        transform: translateY(30px);
        animation: fadeInUp 0.8s 0.6s ease-out forwards;
      }

      #start-btn:hover {
        background-color: #0056b3;
        transform: translateY(-5px); /* Lift button on hover */
        box-shadow: 0 6px 25px rgba(0, 123, 255, 0.4);
      }

      /* Simple responsive adjustments for smaller screens */
      @media (max-width: 768px) {
        .hero-content h1 {
          font-size: 2.5rem;
        }
        .hero-content p {
          font-size: 1.1rem;
        }
      }
      
      /* --- The Fade-In Animation --- */
      @keyframes fadeInUp {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>

    <main class="landing-page">
      <div class="hero-content">
        <h1>Welcome to SPECS</h1>
        <p>A modern hub for Student Projects, Events, and Collaboration.</p>
        <button id="start-btn">Get Started</button>
      </div>
    </main>
  `;

  document.getElementById('start-btn').addEventListener('click', () => {
    // This part of the logic remains the same
    window.location.hash = '#login';
  });
}