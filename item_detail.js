function remove(elems){
  var i;
  for(i=0; i<elems.length; ++i)
    elems[i].parentNode.removeChild(elems[i]);
}

remove(document.querySelectorAll('.correlative-items'));
remove(document.querySelectorAll('.tb-pine'));

chrome.runtime.onConnect.addListener(function(port){
  window.onload = function(){
    var imgs = document.querySelectorAll('img');
    var i;
    var image_loading = 0;

    function done(){
      port.postMessage({
        cmd: 'done',
        html: document.documentElement.outerHTML.replace(/<meta charset="gbk">/, '<meta charset="utf8">'),
      });
    }

    port.onMessage.addListener(function(msg){
      if( msg.cmd == 'img' ){
        imgs[msg.id].src = msg.data;
        --image_loading;
        if( image_loading==0 )
          done();
      }
    });

    ++image_loading;
    for(i=0; i<imgs.length; ++i){
      ++image_loading;
      port.postMessage({
        cmd: 'img',
        id: i,
        url: imgs[i].src
      });
    }
    --image_loading;
    if( image_loading==0 )
      done();

  };
});
