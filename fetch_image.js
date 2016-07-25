chrome.runtime.onMessage.addListener(function(msg, sender, response){
  var img = document.querySelector('img');

  var store = function(){
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    response(canvas.toDataURL('image/jpg'));
  };

  if( img.complete )
    store();
  else
    img.onload = store;
});
