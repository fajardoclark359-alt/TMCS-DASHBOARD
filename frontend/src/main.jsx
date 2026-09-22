import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// GitHub Pages SPA redirect — restore path from query string
;(function () {
  var redirect = sessionStorage.redirect
  delete sessionStorage.redirect
  if (redirect && redirect !== location.href) {
    history.replaceState(null, null, redirect)
  }
})();

// Handle 404.html redirect query parameter
;(function () {
  var path = /^\/?\?\/(.*)$/.exec(location.search)
  if (path) {
    history.replaceState(null, null, '/' + path[1])
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
