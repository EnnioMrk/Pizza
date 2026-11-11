/*******************************************************************************
Copyright © 2021 Ennio Marke
socket.io
*******************************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    
    //#region elements
    var output = document.getElementById("output")
    var input = document.getElementById("input")
    //#endregion
  
    function logOutput(text) {
      var ul = document.getElementById("output");
      var li = document.createElement("li");
      li.appendChild(document.createTextNode("Four"));
      ul.appendChild(li);
    }
  })