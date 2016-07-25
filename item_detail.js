function remove(elems){
  var i;
  for(i=0; i<elems.length; ++i)
    elems[i].parentNode.removeChild(elems[i]);
}

remove(document.querySelectorAll('.correlative-items'));
remove(document.querySelectorAll('.tb-pine'));
remove(document.querySelectorAll('#tad_head_area'));
remove(document.querySelectorAll('#tad_first_area'));
remove(document.querySelectorAll('.tshop-pbsm-shop-top-list'));
remove(document.querySelectorAll('.tshop-pbsm-shop-item-recommend'));

function ready(act){
  if( document.readyState=='complete' )
    setTimeout(act, 0);
  else
    window.onload = act;
}

chrome.runtime.onConnect.addListener(function(port){
  console.log('wating');
  ready(function(){
    console.log('start');
    var imgs = document.querySelectorAll('img');
    var csss = document.querySelectorAll('link[rel=stylesheet]');
    var i;
    var external_loading = imgs.length + csss.length;

    function done(){
      remove(document.querySelectorAll('script'));
      port.postMessage({
        cmd: 'done',
        html: document.documentElement.outerHTML.replace(/<meta charset="gbk">/, '<meta charset="utf8">'),
      });
    }

    port.onMessage.addListener(function(msg){
      if( msg.cmd == 'external' ){
        if( msg.type == 'img-src' )
          imgs[msg.id].src = msg.url;
        if( msg.type == 'css-href' )
          csss[msg.id].href = msg.url;
        --external_loading;
        console.log(external_loading);
        if( external_loading==0 )
          done();
      }
    });

    for(i=0; i<imgs.length; ++i){
      console.log("post img " + i, imgs[i].src);
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'img-src',
        url: imgs[i].src
      });
    }
    for(i=0; i<csss.length; ++i){
      console.log("post external " + i, csss[i].href);
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'css-href',
        ext: 'css',
        url: csss[i].href
      });
    }
    console.log(external_loading);
    if( external_loading==0 )
      done();

  });
});
