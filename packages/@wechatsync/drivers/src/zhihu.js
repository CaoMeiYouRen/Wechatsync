
export default class ZhiHuAdapter {
  constructor() {
    // this.skipReadImage = true
    this.version = '0.0.1'
    this.name = 'zhihu'
  }

  async getMetaData() {
    var res = await $.ajax({
      url:
        'https://www.zhihu.com/api/v4/me?include=account_status%2Cis_bind_phone%2Cis_force_renamed%2Cemail%2Crenamed_fullname',
    })
    // console.log(res);
    return {
      uid: res.uid,
      title: res.name,
      avatar: res.avatar_url,
      supportTypes: ['html'],
      type: 'zhihu',
      displayName: '知乎',
      home: 'https://www.zhihu.com/settings/account',
      icon: 'https://static.zhihu.com/static/favicon.ico',
    }
  }

  async addPost(post) {
    var res = await $.ajax({
      url: 'https://zhuanlan.zhihu.com/api/articles/drafts',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/json',
      data: JSON.stringify({
        title: post.post_title,
        // content: post.post_content
      }),
    })
    console.log(res)
    return {
      status: 'success',
      post_id: res.id,
    }
    //
  }

  async editPost(post_id, post) {
    console.log('editPost', post.post_thumbnail)

    // 移除多余的空行
    post.post_content = post.post_content.replace(/\n(\n)*( )*(\n)*\n/g, '');

    console.log('editPost post.post_content', post.post_content)

    var res = await $.ajax({
      url: 'https://zhuanlan.zhihu.com/api/articles/' + post_id + '/draft',
      type: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({
        title: post.post_title,
        content: post.post_content,
        isTitleImageFullScreen: false,
        titleImage: 'https://pic1.zhimg.com/' + post.post_thumbnail + '.png',
      }),
    })

    return {
      status: 'success',
      post_id: post_id,
      draftLink: 'https://zhuanlan.zhihu.com/p/' + post_id + '/edit',
    }
    // https://zhuanlan.zhihu.com/api/articles/68769713/draft
  }

  untiImageDone(image_id) {
    return new Promise(function (resolve, reject) {
      function waitToNext() {
        console.log('untiImageDone', image_id);
        (async () => {
          var imgDetail = await $.ajax({
            url: 'https://api.zhihu.com/images/' + image_id,
            type: 'GET',
          })
          console.log('imgDetail', imgDetail)
          if (imgDetail.status != 'processing') {
            console.log('all done')
            resolve(imgDetail)
          } else {
            // console.log('go next', waitToNext)
            setTimeout(waitToNext, 300)
          }
        })()
      }
      waitToNext()
    })
  }

  async _uploadFile(file) {
    var src = file.src
    var res = await $.ajax({
      url: 'https://zhuanlan.zhihu.com/api/uploaded_images',
      type: 'POST',
      headers: {
        accept: '*/*',
        'x-requested-with': 'fetch',
      },
      data: {
        url: src,
        source: 'article',
      },
    })

    return [
      {
        id: res.hash,
        object_key: res.hash,
        url: res.src,
      },
    ]
  }

  async uploadFile(file) {
    console.log('ZhiHuDriver.uploadFile', file, md5)
    var updateData = JSON.stringify({
      image_hash: md5(file.bits),
      source: 'article',
    })
    console.log('upload', updateData)
    var fileResp = await $.ajax({
      url: 'https://api.zhihu.com/images',
      type: 'POST',
      dataType: 'JSON',
      contentType: 'application/json',
      data: updateData,
    })

    console.log('upload', fileResp)

    var upload_file = fileResp.upload_file
    if (fileResp.upload_file.state == 1) {
      var imgDetail = await this.untiImageDone(upload_file.image_id)
      console.log('imgDetail', imgDetail)
      upload_file.object_key = imgDetail.original_hash
    } else {
      var token = fileResp.upload_token
      let client = new OSS({
        endpoint: 'https://zhihu-pics-upload.zhimg.com',
        accessKeyId: token.access_id,
        accessKeySecret: token.access_key,
        stsToken: token.access_token,
        cname: true,
        bucket: 'zhihu-pics',
      })
      var finalUrl = await client.put(
        upload_file.object_key,
        new Blob([file.bits])
      )
      console.log(client, finalUrl)
    }
    console.log(file, fileResp)

    if (file.type === 'image/gif') {
      // add extension for gif
      upload_file.object_key = upload_file.object_key + '.gif';
    }
    return [
      {
        id: upload_file.object_key,
        object_key: upload_file.object_key,
        url: 'https://pic4.zhimg.com/' + upload_file.object_key,
        // url: 'https://pic1.zhimg.com/80/' + upload_file.object_key + '_hd.png',
      },
    ]
  }

  async preEditPost(post) {
    var div = $('<div>')
    $('body').append(div)

    // post.content = post.content.replace(/\>\s+\</g,'');
    div.html(post.content)

    // var org = $(post.content);
    // var doc = $('<div>').append(org.clone());
    var doc = div

    tools.doPreFilter(div)
    tools.processDocCode(div)

    var removeIfEmpty = function () {
      var $obj = $(this)
      var originalText = $obj.text()
      if (originalText == '') {
        $obj.remove()
      }
    }

    var removeIfNoImageEmpty = function () {
      var $obj = $(this)
      var originalText = $obj.text()
      var img = $obj.find('img')
      if (originalText == '' && !img.length) {
        $obj.remove()
      }
    }

    var processEmptyLine = function (idx, el) {
      var $obj = $(this)
      var originalText = $obj.text()
      var img = $obj.find('img')
      var brs = $obj.find('br')
      if (originalText == '') {
        ; (function () {
          if (img.length) {
            console.log('has img skip')
            return
          }
          if (!brs.length) {
            console.log('no br skip')
            return
          }
          $obj.remove()
        })()
      } else {
        if (originalText.trim() == '') {
          console.log('processEmptyLine', $obj)
          $obj.remove()
        }
      }
      // try to replace as h2;
    }

    // remove empty break line
    doc.find('section').each(function () {
      var NewElement = $("<div />");
      $.each(this.attributes, function (i, attrib) {
        $(NewElement).attr(attrib.name, attrib.value);
      });
      // Replace the current element with the new one and carry over the contents
      $(this).replaceWith(function () {
        return $(NewElement).append($(this).contents());
      });
    });

    doc.find('p').each(processEmptyLine)
    // doc.find('section').each(processEmptyLine)
    doc.find('div').each(processEmptyLine)
    doc.find('div').each(removeIfNoImageEmpty)

    var processBr = function (idx, el) {
      var $obj = $(this)
      if (!$obj.next().length) {
        $obj.remove()
      }
    }
    doc.find('br').each(processBr)

    var tempDoc = $('<div>').append(doc.clone())
    post.content =
      tempDoc.children('div').length == 1
        ? tempDoc.children('div').html()
        : tempDoc.html()

    // 清除多余的空行
    const nodes = $(post.content)
    let result = ""; // 结果字符串
    $.each(nodes, function (i, node) {
      if (node.nodeType != 3 || node.nodeValue.trim() != "") { // 如果不是空白的文本节点
        result += node.outerHTML; // 拼接到结果字符串
      }
    });
    post.content = result

    console.log('post.content', post.content)
    // div.remove();
    // this.addNotify(post)
  }

  addPromotion(post) {
    // var sharcode = `<blockquote><p>本文使用 <a href="https://zhuanlan.zhihu.com/p/358098152" class="internal">文章同步助手</a> 同步</p></blockquote>`
    // post.content = post.content.trim() + `${sharcode}`
  }
}
