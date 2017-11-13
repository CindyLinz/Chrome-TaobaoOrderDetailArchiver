function each(array, act){
  var i;
  for(i=0; i<array.length; ++i)
    act(array[i], i);
}

function remove(elems){
  var i;
  for(i=0; i<elems.length; ++i)
    elems[i].parentNode.removeChild(elems[i]);
}

remove(document.querySelectorAll('tbcc'));
remove(document.querySelectorAll('.banner'));
remove(document.querySelectorAll('.J_guess-you-like'));

function ready(act){
  if( document.readyState=='complete' )
    setTimeout(act, 0);
  else
    window.onload = act;
}

chrome.runtime.onConnect.addListener(function(port){
  var main = function(){
    var datetime;
    if( document.querySelector('.trade-time') )
      datetime = document.querySelector('.trade-time').innerText;
    else if( document.querySelector('.datetime') )
      datetime = document.querySelector('.datetime').innerText;
    else if( document.querySelector('.step-time-wraper') )
      datetime = document.querySelector('.step-time-wraper').innerText;
    else{
      each(document.querySelectorAll('span'), function(span){
        if( span.innerText == '成交时间:' )
          datetime = span.nextElementSibling.firstElementChild.innerText
      });
      if( !datetime ){
        setTimeout(main, 1000);
        return;
      }
    }

    var item_list = [];
    var item_anchors = document.querySelectorAll('.order-item .txt-info .name a');
    var item_img_anchors;
    if( item_anchors.length ){
      item_img_anchors = document.querySelectorAll('.order-item .pic-info a');
    }
    else{
      item_anchors = document.querySelectorAll('a.item-link');

      if( item_anchors.length ){
        item_img_anchors = document.querySelectorAll('.item-img a');
      }
      else{
        item_anchors = document.querySelectorAll('.order-item .desc .name a');
        item_img_anchors = document.querySelectorAll('.order-item a[title=商品图片]');
      }
    }

    var i;
    for(i=0; i<item_anchors.length; ++i){
      item_list.push(
        item_anchors[i].href.
          replace(/^https:\/\/tradearchive/, 'https://trade').
          replace(/spm=[^&]*&/, '')
      );
      item_anchors[i].href = (i+1) + '.html';
    }
    for(i=0; i<item_img_anchors.length; ++i)
      item_img_anchors[i].href = (i+1) + '.html';

    var imgs = document.querySelectorAll('img');
    var csss = document.querySelectorAll('link[rel=stylesheet]');

    var i;
    var external_loading = imgs.length + csss.length;
    var external_result = [];

    function done(){
      remove(document.querySelectorAll('script'));

      var i, t;
      for(i=0; i<external_result.length; ++i){
        msg = external_result[i];
        if( msg.type == 'img-src' ){
          t = imgs[msg.id].src;
          imgs[msg.id].src = msg.url;
          msg.url = t;
        }
        if( msg.type == 'css-href' ){
          t = csss[msg.id].href;
          csss[msg.id].href = msg.url;
          msg.url = t;
        }
      }

      port.postMessage({
        cmd: 'done',
        datetime: datetime,
        html: document.documentElement.outerHTML.
          replace(/<meta charset="gbk">/, '<meta charset="utf8">').
          replace(
            /<meta http-equiv="Content-Type" content="text\/html; charset=gb2312">/,
            '<meta http-equiv="Content-Type" content="text/html; charset=utf8" />'
          ),
        items: item_list
      });

      for(i=0; i<external_result.length; ++i){
        msg = external_result[i];
        if( msg.type == 'img-src' ){
          t = imgs[msg.id].src;
          imgs[msg.id].src = msg.url;
          msg.url = t;
        }
        if( msg.type == 'css-href' ){
          t = csss[msg.id].href;
          csss[msg.id].href = msg.url;
          msg.url = t;
        }
      }
    }

    port.onMessage.addListener(function(msg){
      if( msg.cmd == 'external' ){
        external_result.push(msg);
        --external_loading;
        if( external_loading==0 )
          done();
      }
    });

    for(i=0; i<imgs.length; ++i){
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'img-src',
        url: imgs[i].src
      });
    }
    for(i=0; i<csss.length; ++i){
      port.postMessage({
        cmd: 'external',
        id: i,
        type: 'css-href',
        ext: 'css',
        url: csss[i].href
      });
    }
    if( external_loading==0 )
      done();
  };
  ready(main);
});
