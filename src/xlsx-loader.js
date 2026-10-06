// Loads the spreadsheet library (src/vendor/xlsx.mini.min.js) only when an
// export is made, so the app starts quickly. The file is saved on the phone
// with the rest of the app, so this needs no internet.
let loading;
export function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "src/vendor/xlsx.mini.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => { loading = null; reject(new Error("Could not load the spreadsheet library.")); };
      document.head.append(script);
    });
  }
  return loading;
}
