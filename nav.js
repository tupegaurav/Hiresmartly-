// Shared header behavior across every page.

(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav.primary-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Mark the current page's link so people can see where they are.
  var here = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('nav.primary-nav a').forEach(function (link) {
    var target = link.getAttribute('href');
    if (target === here || (here === '' && target === 'index.html')) {
      link.setAttribute('aria-current', 'page');
    }
  });
})();
