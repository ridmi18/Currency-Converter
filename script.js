// API CONFIGURATION
const API_KEY = "3da643f8a1718353ec55fd9c"
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/`
const CODES_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/codes`

// DOM ELEMENT REFERENCES
const amountInput = document.getElementById("amount")
const fromCurrencySelect = document.getElementById("fromCurrency")
const toCurrencySelect = document.getElementById("toCurrency")
const convertBtn = document.getElementById("convertBtn")
const swapBtn = document.getElementById("swapBtn")
const resultDiv = document.getElementById("result")
const errorDiv = document.getElementById("error")
const historyList = document.getElementById("historyList")
const rateInfoDiv = document.getElementById("rateInfo")

// GLOBAL VARIABLES
let fromChoices, toChoices // Choices.js instances
let previousFromValue = "INR" // Default from currency
let previousToValue = "USD"  // Default to currency

// UTILITY FUNCTIONS

/**
 * Display error message and clear other messages
 * @param {string} message - Error message to display
 */
function showError(message) {
  errorDiv.textContent = message
  resultDiv.textContent = ""
  rateInfoDiv.textContent = ""
}

/**
 * Display conversion result and rate information
 * @param {string} result - Conversion result to display
 * @param {string} rateInfo - Rate information (optional)
 */
function showResult(result, rateInfo = "") {
  resultDiv.textContent = result
  errorDiv.textContent = ""
  if (rateInfo) {
    rateInfoDiv.textContent = rateInfo
  }
}

/**
 * Clear all message displays
 */
function clearMessages() {
  errorDiv.textContent = ""
  resultDiv.textContent = ""
  rateInfoDiv.textContent = ""
}

/**
 * Format timestamp to readable date string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown"
  return new Date(timestamp).toLocaleString()
}

/**
 * Set convert button loading state
 * @param {boolean} isLoading - Whether button is in loading state
 */
function setButtonLoading(isLoading) {
  convertBtn.disabled = isLoading
  convertBtn.textContent = isLoading ? "Converting..." : "Convert"
}

// CURRENCY MANAGEMENT

/**
 * Fetch supported currencies from API with caching
 * @returns {Array} Array of currency codes and names
 */
async function fetchSupportedCurrencies() {
  const cacheKey = "supported_currencies"
  const cacheTimeKey = "supported_currencies_time"
  
  try {
    // Check cache first (24 hours expiry)
    const cached = localStorage.getItem(cacheKey)
    const cachedTime = localStorage.getItem(cacheTimeKey)
    
    if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 86400000) {
      return JSON.parse(cached)
    }

    // Fetch from API if cache is expired or doesn't exist
    const response = await fetch(CODES_URL)
    const data = await response.json()
    
    if (data.result === "success") {
      // Cache the successful response
      localStorage.setItem(cacheKey, JSON.stringify(data.supported_codes))
      localStorage.setItem(cacheTimeKey, Date.now().toString())
      return data.supported_codes
    } else {
      throw new Error("Failed to fetch supported currencies")
    }
  } catch (error) {
    console.error("Error fetching currencies:", error)
    
    // Try to use cached data as fallback
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // Return fallback currencies if all else fails
    return [
      ["LKR", "Sri Lankan Rupee"],
      ["USD", "US Dollar"],
      ["EUR", "Euro"],
      ["GBP", "British Pound Sterling"],
      ["JPY", "Japanese Yen"],
      ["INR", "Indian Rupee"],
      ["AUD", "Australian Dollar"],
      ["CAD", "Canadian Dollar"],
      ["CHF", "Swiss Franc"],
      ["CNY", "Chinese Yuan"],
    ]
  }
}

/**
 * Add event handlers for currency selection changes
 * Prevents selecting the same currency for both from and to
 */
function addCurrencyChangeHandlers() {
  // Handle 'from' currency changes
  fromCurrencySelect.addEventListener("change", () => {
    const currentFrom = fromCurrencySelect.value
    const currentTo = toCurrencySelect.value
    
    // If same currency selected, change the 'to' currency to previous 'from' value
    if (currentFrom === currentTo) {
      toChoices.setChoiceByValue(previousFromValue)
    }
    
    // Update previous values
    previousFromValue = currentFrom
    previousToValue = toCurrencySelect.value
  })

  // Handle 'to' currency changes
  toCurrencySelect.addEventListener("change", () => {
    const currentFrom = fromCurrencySelect.value
    const currentTo = toCurrencySelect.value
    
    // If same currency selected, change the 'from' currency to previous 'to' value
    if (currentTo === currentFrom) {
      fromChoices.setChoiceByValue(previousToValue)
    }
    
    // Update previous values
    previousToValue = currentTo
    previousFromValue = fromCurrencySelect.value
  })
}

/**
 * Setup currency selector dropdowns with Choices.js
 */
async function setupCurrencySelectors() {
  try {
    // Fetch available currencies
    const currencies = await fetchSupportedCurrencies()
    
    if (currencies.length === 0) {
      showError("Failed to load currency list. Please try again later.")
      return
    }

    // Clear existing options
    fromCurrencySelect.innerHTML = ""
    toCurrencySelect.innerHTML = ""

    // Populate select elements with currency options
    currencies.forEach(([code, name]) => {
      // Create option for 'from' currency selector
      const optionFrom = document.createElement("option")
      optionFrom.value = code
      optionFrom.textContent = `${code} - ${name}`
      fromCurrencySelect.appendChild(optionFrom)

      // Create option for 'to' currency selector
      const optionTo = document.createElement("option")
      optionTo.value = code
      optionTo.textContent = `${code} - ${name}`
      toCurrencySelect.appendChild(optionTo)
    })

    // Set default values to LKR → USD
    fromCurrencySelect.value = "INR"
    toCurrencySelect.value = "USD"

    // Destroy existing Choices instances if they exist
    if (fromChoices) fromChoices.destroy()
    if (toChoices) toChoices.destroy()

    // Initialize Choices.js for enhanced dropdowns
    const Choices = window.Choices
    fromChoices = new Choices(fromCurrencySelect, {
      searchEnabled: true,    // Enable search functionality
      itemSelectText: "",     // Remove default select text
      shouldSort: false,      // Keep original order
    })

    toChoices = new Choices(toCurrencySelect, {
      searchEnabled: true,
      itemSelectText: "",
      shouldSort: false,
    })

    // Set initial values to LKR → USD
    fromChoices.setChoiceByValue("JPY")
    toChoices.setChoiceByValue("LKR")
    previousFromValue = "LKR"
    previousToValue = "USD"

    // Add change event handlers
    addCurrencyChangeHandlers()
  } catch (error) {
    console.error("Error setting up currency selectors:", error)
    showError("Failed to initialize currency selectors. Please refresh the page.")
  }
}

// EXCHANGE RATE MANAGEMENT

/**
 * Fetch exchange rates for a base currency with caching
 * @param {string} baseCurrency - Base currency code
 * @returns {Object} Object containing rates and timestamp
 */
async function fetchRates(baseCurrency) {
  const cacheKey = `rates_${baseCurrency}`
  const cacheTimeKey = `rates_${baseCurrency}_time`
  
  try {
    // Check cache first (1 hour expiry)
    const cachedRates = localStorage.getItem(cacheKey)
    const cachedTime = localStorage.getItem(cacheTimeKey)
    
    if (cachedRates && cachedTime && Date.now() - parseInt(cachedTime) < 3600000) {
      return {
        rates: JSON.parse(cachedRates),
        timestamp: parseInt(cachedTime),
      }
    }

    // Fetch fresh rates from API
    const response = await fetch(API_URL + baseCurrency)
    const data = await response.json()
    
    if (data.result === "error") {
      throw new Error(data["error-type"] || "API Error")
    }

    // Cache the results
    localStorage.setItem(cacheKey, JSON.stringify(data.conversion_rates))
    localStorage.setItem(cacheTimeKey, Date.now().toString())

    return {
      rates: data.conversion_rates,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error("Error fetching rates:", error)
    
    // Try to use cached data as fallback
    const cachedRates = localStorage.getItem(cacheKey)
    const cachedTime = localStorage.getItem(cacheTimeKey)
    
    if (cachedRates && cachedTime) {
      return {
        rates: JSON.parse(cachedRates),
        timestamp: parseInt(cachedTime),
      }
    }
    
    throw error
  }
}

/**
 * Convert currency amount using exchange rates
 * @param {number} amount - Amount to convert
 * @param {string} from - From currency code
 * @param {string} to - To currency code
 * @param {Object} rates - Exchange rates object
 * @returns {number|null} Converted amount or null if conversion fails
 */
function convertCurrency(amount, from, to, rates) {
  if (!rates || !rates[to]) return null
  
  const baseRate = rates[from] || 1  // Base rate (usually 1 for the base currency)
  const targetRate = rates[to]       // Target currency rate
  
  // Convert: (amount / baseRate) * targetRate
  return (amount / baseRate) * targetRate
}

// HISTORY MANAGEMENT

/**
 * Load conversion history from localStorage and display
 */
function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem("conversionHistory")) || []
    historyList.innerHTML = ""
    
    // Display each history entry
    history.forEach((entry) => {
      const li = document.createElement("li")
      li.textContent = `[${entry.date}] ${entry.from} → ${entry.to}`
      historyList.appendChild(li)
    })
  } catch (error) {
    console.error("Error loading history:", error)
  }
}

/**
 * Save conversion to history
 * @param {Object} entry - History entry object
 */
function saveHistory(entry) {
  try {
    const history = JSON.parse(localStorage.getItem("conversionHistory")) || []
    history.unshift(entry) // Add to beginning of array
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.splice(10)
    }
    
    // Save back to localStorage
    localStorage.setItem("conversionHistory", JSON.stringify(history))
    loadHistory() // Refresh display
  } catch (error) {
    console.error("Error saving history:", error)
  }
}

// MAIN CONVERSION LOGIC

/**
 * Handle currency conversion process
 */
async function handleConvert() {
  clearMessages()
  
  const amount = parseFloat(amountInput.value)

  // Input validation
  if (isNaN(amount) || amount < 1 || amount > 1000000000) {
    showError("Please enter a valid amount between 1 and 1,000,000,000")
    return
  }

  const from = fromCurrencySelect.value
  const to = toCurrencySelect.value

  // Check if different currencies are selected
  if (from === to) {
    showError("Please select two different currencies")
    return
  }

  setButtonLoading(true)

  try {
    // Fetch exchange rates
    const rateData = await fetchRates(from)
    const convertedAmount = convertCurrency(amount, from, to, rateData.rates)

    if (convertedAmount === null) {
      showError("Conversion failed. Please try again")
    } else {
      // Format and display results
      const formattedAmount = amount.toLocaleString()
      const formattedResult = convertedAmount.toFixed(2)
      const rate = rateData.rates[to] / (rateData.rates[from] || 1)

      showResult(
        `${formattedAmount} ${from} = ${parseFloat(formattedResult).toLocaleString()} ${to}`,
        `Rate: 1 ${from} = ${rate.toFixed(4)} ${to} | Updated: ${formatTimestamp(rateData.timestamp)}`
      )

      // Save to history
      saveHistory({
        date: new Date().toLocaleString(),
        from: `${formattedAmount} ${from}`,
        to: `${parseFloat(formattedResult).toLocaleString()} ${to}`,
      })
    }
  } catch (error) {
    console.error("Conversion error:", error)
    showError(`Error: ${error.message}`)
  } finally {
    setButtonLoading(false)
  }
}

// UI EVENT HANDLERS

/**
 * Swap the selected currencies
 */
function swapCurrencies() {
  // Swap the values
  const temp = fromCurrencySelect.value
  fromCurrencySelect.value = toCurrencySelect.value
  toCurrencySelect.value = temp

  // Update Choices.js displays
  fromChoices.setChoiceByValue(fromCurrencySelect.value)
  toChoices.setChoiceByValue(toCurrencySelect.value)

  // Update previous values
  previousFromValue = fromCurrencySelect.value
  previousToValue = toCurrencySelect.value

  // Auto-convert if amount is present
  if (amountInput.value && parseFloat(amountInput.value) > 0) {
    handleConvert()
  }
}

/**
 * Setup input validation and auto-conversion
 */
function setupInputValidation() {
  // Clear messages when user starts typing valid input
  amountInput.addEventListener("input", function () {
    const value = parseFloat(this.value)
    if (this.value && !isNaN(value) && value > 0) {
      clearMessages()
    }
  })

  // Auto-convert when amount changes (with debounce to avoid too many API calls)
  let timeoutId
  amountInput.addEventListener("input", function () {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      if (this.value && parseFloat(this.value) > 0) {
        handleConvert()
      }
    }, 1000) // Wait 1 second after user stops typing
  })
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Convert button click
  convertBtn.addEventListener("click", handleConvert)
  
  // Swap button click
  swapBtn.addEventListener("click", swapCurrencies)

  // Allow Enter key to trigger conversion
  amountInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleConvert()
    }
  })

  // Setup input validation and auto-conversion
  setupInputValidation()
}


// APPLICATION INITIALIZATION

/**
 * Initialize the currency converter application
 */
async function init() {
  try {
    // Setup currency selectors with API data
    await setupCurrencySelectors()
    
    // Load conversion history from localStorage
    loadHistory()
    
    // Setup all event listeners
    setupEventListeners()

    // Set focus to amount input for better UX
    amountInput.focus()
    
    console.log("Currency converter initialized successfully")
  } catch (error) {
    console.error("Initialization error:", error)
    showError("Failed to initialize the currency converter. Please refresh the page.")
  }
}

// APPLICATION START

// Start the application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", init)