// import backToTop from './backToTop';
// import mobileNavbar from './mobileNavbar';
// import toc from './toc';
// import headerAnchor from './headerAnchor';
// import fnTooltip from './footnoteTooltip';
// import highlight from './highlight';

/**
 * back to top
 */
var backToTop = function() {
  const $backToTop = $('#back-to-top');

  $(window)
    .scroll(function() {
      if ($(window)
        .scrollTop() > 100) {
        $backToTop.fadeIn(1000);
      } else {
        $backToTop.fadeOut(1000);
      }
    })

  $backToTop.click(function() {
    $('body,html')
      .animate({
        scrollTop: 0
      });
  })
}


/**
 * mobile Navbar
 */
var mobileNavbar = function() {
  const $mobileNav = $('#mobile-navbar');
  const $mobileNavIcon = $('.mobile-navbar-icon');
  const slideout = new Slideout({
    'panel': document.getElementById('mobile-panel'),
    'menu': document.getElementById('mobile-menu'),
    'padding': 180,
    'tolerance': 70
  })
  slideout.disableTouch()

  $mobileNavIcon.click(function () {
    slideout.toggle()
  })

  slideout.on('beforeopen', function () {
    $mobileNav.addClass('fixed-open')
    $mobileNavIcon.addClass('icon-click').removeClass('icon-out')
  })

  slideout.on('beforeclose', function () {
    $mobileNav.removeClass('fixed-open')
    $mobileNavIcon.addClass('icon-out').removeClass('icon-click')
  })

  $('#mobile-panel').on('touchend', function () {
    slideout.isOpen() && $mobileNavIcon.click()
  })

  $('.mobile-submenu-open').on('click', function () {
    const $mobileSubmenuList = $('.mobile-submenu-list')
    const $mobileMenuParent = $('.mobile-menu-parent')

    if ($(this).parent().next().css('display') == "none") {
      $mobileSubmenuList.slideUp(300)
      $(this).parent().next('ul').slideDown(300)
      $(this).parent().addClass('mobile-submenu-show')
      $(this).parent().parent().siblings().children().removeClass('mobile-submenu-show')
    } else {
      $(this).parent().next('ul').slideUp(300)
      $mobileMenuParent.removeClass('mobile-submenu-show')
    }
  });
}


/**
 * Table of Content fix
 */
function initToc() {
  const $toc = $('#post-toc');
  if ($toc.length && $(window)
    .width() >= 1080) {
    $(window)
      .scroll(function() {
        if ($(window)
          .scrollTop() > 100) {
          $toc.fadeIn(1000);
        } else {
          $toc.fadeOut(100);
        }
      });
  }
}

var toc = function() {
  const tocContainer = document.getElementById('post-toc');
  if (tocContainer !== null) {
    const toc = document.getElementById('TableOfContents');
    if (toc === null) {
      // if global config 'toc = true', but there are no headings
      tocContainer.parentNode.removeChild(tocContainer);
    } else {
      initToc();
      refactorToc(toc);
      linkToc();
    }
  }
}

// function initToc(){
//  const SPACING = 20;
//   const $toc = $('.post-toc');
//   const $footer = $('.post-footer');

//   if ($toc.length) {
//     const minScrollTop = $toc.offset().top - SPACING;
//     const maxScrollTop = $footer.offset().top - $toc.height() - SPACING;

//     const tocState = {
//       start: {
//         'position': 'absolute',
//         'top': minScrollTop,
//       },
//       process: {
//         'position': 'fixed',
//         'top': SPACING,
//       },
//       end: {
//         'position': 'absolute',
//         'top': maxScrollTop,
//       },
//     };

//     $(window).scroll(function() {
//       const scrollTop = $(window).scrollTop();

//       if (scrollTop < minScrollTop) {
//         $toc.css(tocState.start);
//       } else if (scrollTop > maxScrollTop) {
//         $toc.css(tocState.end);
//       } else {
//         $toc.css(tocState.process);
//       }
//     });
//   }

//   const HEADERFIX = 30;
//   const $toclink = $('.toc-link');
//   const $headerlink = $('.headerlink');
//   const $tocLinkLis = $('.post-toc-content li');

//   const headerlinkTop = $.map($headerlink, function(link) {
//     return $(link).offset().top;
//   });

//   const headerLinksOffsetForSearch = $.map(headerlinkTop, function(offset) {
//     return offset - HEADERFIX;
//   });

//   const searchActiveTocIndex = function(array, target) {
//     for (let i = 0; i < array.length - 1; i++) {
//       if (target > array[i] && target <= array[i + 1]) return i;
//     }
//     if (target > array[array.length - 1]) return array.length - 1;
//     return -1;
//   };

//   $(window).scroll(function() {
//     const scrollTop = $(window).scrollTop();
//     const activeTocIndex = searchActiveTocIndex(headerLinksOffsetForSearch, scrollTop);

//     $($toclink).removeClass('active');
//     $($tocLinkLis).removeClass('has-active');

//     if (activeTocIndex !== -1 && $toclink[activeTocIndex] != null) {
//       $($toclink[activeTocIndex]).addClass('active');
//       let ancestor = $toclink[activeTocIndex].parentNode;
//       while (ancestor.tagName !== 'NAV') {
//         $(ancestor).addClass('has-active');
//         ancestor = ancestor.parentNode.parentNode;
//       }
//     }
//   });  
// }

function refactorToc(toc){
  // when headings do not start with `h1`
  const oldTocList = toc.children[0];
  let newTocList = oldTocList;
  let temp;
  while (newTocList.children.length === 1
      && (temp = newTocList.children[0].children[0]).tagName === 'UL') {
    newTocList = temp;
  }

  if (newTocList !== oldTocList) toc.replaceChild(newTocList, oldTocList);
}

function linkToc(){
    const links = document.querySelectorAll('#TableOfContents a:first-child');
  for (let i = 0; i < links.length; i++) links[i].className += ' toc-link';

  for (let num = 1; num <= 6; num++) {
    const headers = document.querySelectorAll('.post-content>h' + num);
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      header.innerHTML = `<a href="#${header.id}" class="headerlink anchor"><i class="iconfont icon-link"></i></a>${header.innerHTML}`;
    }
  }
}



/**
* Anchor for post content header
**/
var anchorForId = function (id) {
  var anchor = document.createElement("a");
  anchor.className = "header-link";
  anchor.href = "#" + id;
  anchor.innerHTML = '<svg viewBox="0 0 16 10" version="1.1" width="24" height="24"><path d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"/></svg>';
  return anchor;
};

var linkifyAnchors = function (level, containingElement) {
  var headers = containingElement.getElementsByTagName("h" + level);
  for (var h = 0; h < headers.length; h++) {
    var header = headers[h];
    header.className = "post-content-header";

    if (typeof header.id !== "undefined" && header.id !== "") {
      // insert header-link before the header
      header.appendChild(anchorForId(header.id));
    }
  }
};

var headerAnchor = function() {
  var contentBlock = document.getElementsByClassName("post-content")[0];
  if (!contentBlock) {
    return;
  }

  for (var level = 1; level <= 4; level++) {
    linkifyAnchors(level, contentBlock);
  }
};


/**
 * footnote tooltip
 */
var fnTooltip = function () {
  $(".footnote-ref").each(function () {
    var id = $(this).children("a").attr("href").substr(1),
      footnote = $(document.getElementById(id)).clone(),
      outer_wrapper = $("<span>", { "class": "fn-content" }),
      inner_wrapper = $("<span>", { "class": "fn-text" });
    footnote.find(".footnote-return").remove();
    $(this).append(outer_wrapper.append(inner_wrapper.html(footnote.html())));
  });

  // fix tooltip position & width
  var position = function () {
    var content = $(".fn-content").removeAttr("style");
    if ($(window).width() < 640)
      content.css("width", $(window).width() / 2);
    else
      content.css("width", 340); // default value
    content.each(function () {
      var width = $(this).children(".fn-text").outerWidth();
      $(this).css({
        "width": width,
        "margin-left": width / -2
      });
    });
  }
  position();
  $(window).resize(position());
}


/**
 * highlight
 */
var highlight = function () {
  document.querySelectorAll('.chroma>table')
    .forEach((element) => {
      const sub = element.querySelector('code[data-lang]');
      if (sub !== null) {
        element.setAttribute('data-lang', mapLang(sub.getAttribute('data-lang')));
      }
    });
}

function mapLang(name) {
  return {
    coffeescript: 'CoffeeScript',
    cpp: 'C++',
    cs: 'C#',
    css: 'CSS',
    html: 'HTML',
    http: 'HTTP',
    js: 'JavaScript',
    json: 'JSON',
    objectivec: 'Objective-C',
    php: 'PHP',
    sql: 'SQL',
    toml: 'TOML',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    xml: 'XML',
    yaml: 'YAML',
  }[name] || name;
}


/* main */
$(document).ready(function () {
  backToTop();
  mobileNavbar();
  toc();
  headerAnchor();
  fnTooltip();
});

highlight();
