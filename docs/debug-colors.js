// Debug script for testing color application
// Run this in the browser console to test color functionality

function debugColors() {
  console.log("=== COLOR DEBUGGING SCRIPT ===");

  // Check if JavaScript is running
  console.log("JavaScript is running");

  // Check if Gantt library is loaded
  if (typeof Gantt !== "undefined") {
    console.log("✅ Frappe Gantt library is loaded");
  } else {
    console.log("❌ Frappe Gantt library is NOT loaded");
    return;
  }

  // Check DOM structure
  const ganttContainer = document.getElementById("gantt");
  if (!ganttContainer) {
    console.log("❌ Gantt container not found");
    return;
  }

  console.log("✅ Gantt container found");
  console.log("Container HTML length:", ganttContainer.innerHTML.length);

  // Find all rect elements
  const allRects = document.querySelectorAll("#gantt rect");
  console.log(`Found ${allRects.length} rect elements`);

  if (allRects.length > 0) {
    console.log("First rect details:", {
      fill: allRects[0].getAttribute("fill"),
      styleFill: allRects[0].style.fill,
      className: allRects[0].className,
      parentElement:
        allRects[0].parentElement.className ||
        allRects[0].parentElement.tagName,
    });
  }

  // Find bar-wrapper elements
  const barWrappers = document.querySelectorAll("#gantt .bar-wrapper");
  console.log(`Found ${barWrappers.length} bar-wrapper elements`);

  // Test manual color application
  console.log("Testing manual color application...");

  const testColors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];

  allRects.forEach((rect, index) => {
    const color = testColors[index % testColors.length];
    rect.style.fill = color;
    rect.setAttribute("fill", color);
    console.log(`Applied ${color} to rect ${index}`);
  });

  console.log("Manual color application complete");
}

// Test CSS color application
function testCSSColors() {
  console.log("=== TESTING CSS COLORS ===");

  const barWrappers = document.querySelectorAll("#gantt .bar-wrapper");

  barWrappers.forEach((wrapper, index) => {
    const testClasses = [
      "hcd-task",
      "engineering-task",
      "product-task",
      "accessibility-task",
      "content-task",
    ];
    const testClass = testClasses[index % testClasses.length];
    wrapper.classList.add(testClass);
    console.log(`Added class ${testClass} to bar-wrapper ${index}`);
  });

  console.log("CSS class application complete");
}

// Check for CSS conflicts
function checkCSSConflicts() {
  console.log("=== CHECKING CSS CONFLICTS ===");

  const allRects = document.querySelectorAll("#gantt rect");

  allRects.forEach((rect, index) => {
    const computedStyle = window.getComputedStyle(rect);
    const fill = computedStyle.fill;
    const backgroundColor = computedStyle.backgroundColor;

    console.log(`Rect ${index}:`, {
      fill: fill,
      backgroundColor: backgroundColor,
      inlineFill: rect.style.fill,
      attributeFill: rect.getAttribute("fill"),
    });
  });
}

// Run all debug functions
function runAllDebugTests() {
  debugColors();
  setTimeout(testCSSColors, 1000);
  setTimeout(checkCSSConflicts, 2000);
}

// Make functions available globally
window.debugColors = debugColors;
window.testCSSColors = testCSSColors;
window.checkCSSConflicts = checkCSSConflicts;
window.runAllDebugTests = runAllDebugTests;

console.log(
  "Debug functions loaded. Run debugColors(), testCSSColors(), checkCSSConflicts(), or runAllDebugTests()"
);
