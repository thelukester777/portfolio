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
        carouselButtons = $('.slick-arrow, .slick-dots'),
        headerWindow = $('header'),
        closeButton = $('.close-button, .close-modal');

    $(carouselInit).click(function() {
        var clickedCarouselLink = $(this).attr('title');
            
        setTimeout(function() {
            var modalWindow = $('.modal-' + clickedCarouselLink), 
                carouselWindow = $('.carousel-' + clickedCarouselLink),
                modalScreen = $('.screen, .modal-' + clickedCarouselLink);
            $(headerWindow).append($(modalWindow));
            $(modalScreen).fadeIn('fast');
            $(carouselWindow).slick({
                lazyLoad: 'ondemand',
                dots: true,
                infinite: true,
                speed: 500,
                fade: true,
                cssEase: 'linear',
                appendDots: $(headerWindow),
                appendArrows: $(headerWindow),
                slidesToShow: 1,
                adaptiveHeight: true
            });
            $(closeButton).click(function() {
                $(carouselWindow).slick('unslick'),
                $(modalScreen).hide();
            });
        }, 100);

    });

});