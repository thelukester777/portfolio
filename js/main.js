$(document).ready(function() {
    function o(o) {
        function anchorClick() {
            "page" == t[0] && void 0 !== t[1] ? ($(mainNav).hide(),
                    $("#" + t[1]).fadeIn("slow"),
                    $(navHeader).removeClass().addClass(t[1]),
                    console.log("DEV NOTE: The Query String is " + t[1])) : console.log("DEV NOTE: No query string or obsolete one used."),
                "debug" === t[0] && "true" === t[1] ? console.log("DEBUG MODE ON") : console.log = function() {};
        }
        for (var s = window.location.search.substring(1), a = s.split("&"), l = 0; l < a.length; l++) {
            var t = a[l].split("=");
            if (t[0] == o) return t[1];
        }
        anchorClick();
    }
    var anchorClick = $('a'),
        mainNav = $('.main'),
        navHeader = $('nav, header');
    $(anchorClick).click(function() {
        var o = $(this).attr('data-link');
        $(mainNav).hide(), $('#' + o).fadeIn('slow'), $(navHeader).removeClass().addClass(o);
    }), /*hljs.initHighlightingOnLoad(),*/ o(); 

    var carouselInit = $('.show-carousel'),
        modalInit = $('.show-modal'),
        carouselButtons = $('.slick-arrow, .slick-dots'),
        headerWindow = $('header'),
        body = $('body'),
        closeButton = $('.close-button, .close-modal');
    
    // Carousels
    $(carouselInit).click(function() {
        var clickedCarouselLink = $(this).attr('title');
        setTimeout(function() {
            var carouselWindow = $('.carousel-' + clickedCarouselLink);
            $(carouselWindow).slick({
                centerMode: true,
                centerPadding: '100px',
                slidesToShow: 3,
                lazyLoad: 'ondemand',
                dots: true,
                infinite: true,
                speed: 500,
                adaptiveHeight: true,
            });
        }, 100);
    }),
    // Modals
    $(modalInit).click(function() {
        var clickedModalLink = $(this).attr('title');
        console.log(clickedModalLink);
            
        setTimeout(function() {
            var modalWindow = $('.modal-' + clickedModalLink), 
                modalScreen = $('.screen, .modal-' + clickedModalLink);
            $(body).append($(modalWindow));
            $(modalScreen).fadeIn('fast');
            $(closeButton).click(function() {
                $(modalScreen).hide();
            });
        }, 100);

    });

});