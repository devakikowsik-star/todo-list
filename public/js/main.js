// Sports Scheduler Client Interactivity
document.addEventListener('DOMContentLoaded', () => {
  // Auto-dismiss success flash alerts after 5 seconds
  const successAlerts = document.querySelectorAll('.alert-success');
  successAlerts.forEach((alert) => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 5000);
  });

  // Client-side date check on session create form
  const sessionForm = document.getElementById('createSessionForm');
  if (sessionForm) {
    sessionForm.addEventListener('submit', (e) => {
      const dtInput = document.getElementById('dateTime');
      if (dtInput && dtInput.value) {
        const selectedDate = new Date(dtInput.value);
        if (selectedDate <= new Date()) {
          e.preventDefault();
          alert('Session date and time must be set in the future.');
          dtInput.focus();
        }
      }
    });
  }
});
