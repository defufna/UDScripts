// ==UserScript==
// @name     UD Mobile
// @version  1
// @include			http://urbandead.com/map.cgi*
// @include			http://www.urbandead.com/map.cgi*
// @exclude			http://urbandead.com/map.cgi*?logout
// @exclude			http://www.urbandead.com/map.cgi*?logout
// @grant    none
// ==/UserScript==


function mobileView(){
    var target = document.querySelector("div.gthome");
    var div = document.createElement("div");
    div.setAttribute("class", "gp");
    
    var source = document.querySelector("td.gp");
    while(source.children.length > 0){
      div.appendChild(source.children[0]);
    }
    source.remove();
    target.insertAdjacentElement('afterend', div);
    
    map = document.querySelector("table.c");
    
    style = map.getAttribute("style");
    if(style == null){
      style = "";
    }
    
    style += "margin:auto;"
    map.setAttribute("style", style);
    
  }
  
  mobileView();