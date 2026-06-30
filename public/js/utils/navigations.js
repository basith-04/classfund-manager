function navigateToHome() {
    document.getElementById("class-fund-page").classList.add("hidden");
    document.getElementById("my-payments-page").classList.add("hidden");
    document.getElementById("home-page").classList.remove("hidden");
}

function navigateToClassFund() {
    document.getElementById("home-page").classList.add("hidden");
    document.getElementById("my-payments-page").classList.add("hidden");
    document.getElementById("class-fund-page").classList.remove("hidden");
}

function navigateToMyPayments() {
    document.getElementById("home-page").classList.add("hidden");
    document.getElementById("class-fund-page").classList.add("hidden");
    document.getElementById("my-payments-page").classList.remove("hidden");
}

function openPayModal() {
    document.getElementById("modalOverlay").classList.add("visible-modal")
    
}

function closePayModal() {
    document.getElementById("modalOverlay").classList.remove("visible-modal")
}

export {navigateToClassFund,navigateToMyPayments,navigateToHome,openPayModal,closePayModal}