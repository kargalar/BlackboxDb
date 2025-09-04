// This file contains the JavaScript code for the project. It handles any dynamic behavior and interactions on the web page.

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document is ready!');

    // Example of a dynamic interaction
    const button = document.getElementById('myButton');
    if (button) {
        button.addEventListener('click', () => {
            alert('Button was clicked!');
        });
    }

    // Additional JavaScript functionality can be added here
});