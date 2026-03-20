// ============================================
// MAIN JAVASCRIPT FILE FOR FITNESS HUB
// ============================================

// BMI Calculator Function
function calculateBMI() {
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const resultDiv = document.getElementById('bmiResult');

    if (!height || !weight || height <= 0 || weight <= 0) {
        showAlert('Please enter valid height and weight values', 'danger');
        return;
    }

    // Convert height from cm to meters
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    let category = '';
    let categoryClass = '';

    if (bmi < 18.5) {
        category = 'Underweight';
        categoryClass = 'underweight';
    } else if (bmi >= 18.5 && bmi < 25) {
        category = 'Normal Weight';
        categoryClass = 'normal';
    } else if (bmi >= 25 && bmi < 30) {
        category = 'Overweight';
        categoryClass = 'overweight';
    } else {
        category = 'Obese';
        categoryClass = 'obese';
    }

    resultDiv.innerHTML = `
        <h4>Your BMI Result</h4>
        <div class="bmi-value">${bmi.toFixed(1)}</div>
        <p>Height: ${height} cm | Weight: ${weight} kg</p>
        <p class="bmi-category ${categoryClass}"><strong>${category}</strong></p>
        <p style="font-size: 12px; margin-top: 15px; color: #a0a0a0;">
            BMI Categories: Underweight (<18.5) | Normal (18.5-24.9) | Overweight (25-29.9) | Obese (≥30)
        </p>
    `;

    resultDiv.classList.add('show');
}

// Navigate to Register Page
function goToRegister() {
    window.location.href = 'pages/register.html';
}

// Show Alert Messages
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Smooth Scroll Enhancement
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animation on Scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .plan-card, .trainer-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (Uncomment when adding Firebase)
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();
// const auth = firebase.auth();
