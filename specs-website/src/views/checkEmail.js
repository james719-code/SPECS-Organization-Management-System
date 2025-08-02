// views/check-email.js

export default function renderCheckEmailPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container d-flex flex-column justify-content-center" style="min-height: 100vh;">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6 col-xl-5">

          <div class="card shadow-lg text-center">
            <div class="card-body p-4 p-md-5">
              
              <div class="mb-4">
                <i class="bi-envelope-check-fill text-primary" style="font-size: 4rem;"></i>
              </div>

              <h2 class="card-title h3 fw-bold">Check Your Inbox!</h2>
              <p class="card-text text-body-secondary">
                We've sent a verification link to your email address. Please click the link in that email to activate your account.
              </p>
              <p class="small text-muted mt-3">
                If you don't see the email, be sure to check your spam or junk folder.
              </p>

              <div class="d-grid mt-4">
                <a href="#login" class="btn btn-primary">Return to Login</a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  `;
}