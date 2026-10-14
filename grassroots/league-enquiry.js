const form = document.getElementById('league-enquiry');
const status = document.getElementById('form-status');
const button = form.querySelector('button[type="submit"]');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  if (data.website) return;
  button.disabled = true;
  button.textContent = 'SENDING…';
  status.className = 'form-status';
  status.textContent = '';
  try {
    const response = await fetch('/api/grassroots-league-enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error('League enquiry could not be sent');
    form.reset();
    status.classList.add('success');
    status.textContent = 'Thank you. Your league enquiry has been sent to Football Talk. We’ll reply by email.';
  } catch (error) {
    status.classList.add('error');
    status.textContent = 'Sorry, your enquiry could not be sent. Please try again or email info@footballtalk.uk.';
  } finally {
    button.disabled = false;
    button.textContent = 'SEND LEAGUE ENQUIRY →';
  }
});
