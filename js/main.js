$(function(){var e,r;r=location.pathname.replace(/\//g,"");$("."+r).addClass("active");e=$(window);return e.on("scroll",function(){if(!(e.width()>992)){return}if(e.scrollTop()>80){return $(".toc").addClass("fixed")}else{return $(".toc").removeClass("fixed")}})});