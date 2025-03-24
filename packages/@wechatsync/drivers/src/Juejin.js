export default class JuejinAdapter {
  constructor(ac) {
    this.version = '0.0.2'
    this.name = 'juejin'

    // modify origin headers
    modifyRequestHeaders('api.juejin.cn', {
      Origin: 'https://juejin.cn',
      Referer: 'https://juejin.cn/'
    }, [
      '*://api.juejin.cn/*',
    ], function (details) {

      if (details.initiator && details.initiator.indexOf('juejin.cn') > -1) {
        details.requestHeaders = details.requestHeaders.map(_ => {
          if (_.name === 'Origin') {
            _.value = details.initiator
          }

          if (_.name === 'Referer') {
            _.value = details.initiator + '/'
          }

          return _
        })
      }
    })

    // modify origin headers
    // modifyRequestHeaders('juejin.cn', {
    //   Origin: 'https://juejin.cn',
    //   Referer: 'https://juejin.cn/'
    // }, [
    //   '*://juejin.cn/*'  // 添加图片上传路径
    // ], function (details) {
    //   console.log('details', details)
    //   // if (details.initiator && details.initiator.indexOf('juejin.cn') > -1) {
    //   //   details.requestHeaders = details.requestHeaders.map(_ => {
    //   //     if (_.name === 'Origin') {
    //   //       _.value = details.initiator
    //   //     }
    //   //     if (_.name === 'Referer') {
    //   //       _.value = details.initiator + '/'
    //   //     }
    //   //     return _
    //   //   })
    //   // }
    // })

  }

  async getMetaData() {
    var data = await $.get('https://api.juejin.cn/user_api/v1/user/get')
    console.log(data)
    return {
      uid: data.data.user_id,
      title: data.data.user_name,
      avatar: data.data.avatar_large,
      type: 'juejin',
      displayName: '掘金',
      raw: data.data,
      supportTypes: ['markdown', 'html'],
      home: 'https://juejin.cn/editor/drafts',
      icon: 'https://juejin.cn/favicon.ico',
    }
  }

  async addPost(post, _instance) {
    return {
      status: 'success',
      post_id: 0,
    }
  }

  async editPost(post_id, post) {
    var turndownService = new turndown({
      headingStyle: 'atx',
      bulletListMarker: '-',
      hr: '---',
    })
    turndownService.use(tools.turndownExt)
    console.log('post.markdown', post.markdown)
    var markdown = post.markdown || turndownService.turndown(post.post_content)
    console.log('markdown', markdown)
    const { data } = await axios.post('https://api.juejin.cn/content_api/v1/article_draft/create', {
      brief_content: '',
      category_id: '0',
      cover_image: '', // 封面
      edit_type: 10,
      html_content: "deprecated",
      link_url: "",
      mark_content: markdown,
      tag_ids: [],
      title: post.post_title,
      // id: post_id
    }, {
      // params: {
      //   aid: 2608,
      //   uuid: this.uuid
      // }
    })
    console.log(data)
    post_id = data.data.id
    return {
      status: 'success',
      post_id: post_id,
      draftLink: 'https://juejin.cn/editor/drafts/' + post_id,
    }
  }

  async uploadFile(file) {
    var src = file.src
    var imageId = Date.now() + Math.floor(Math.random() * 1000)
    // const { data } = await $.ajax({
    //   url: 'https://juejin.cn/image/urlSave?aid=2608&uuid=' + this.uuid,
    //   type: 'POST',
    //   dataType: 'JSON',
    //   data: JSON.stringify({
    //     url: src,
    //     imgType: "private",
    //     version: "2.0"
    //   }),
    //   contentType: 'application/json',
    //   xhrFields: {
    //     withCredentials: true // 确保发送 cookies
    //   },
    //   headers: {
    //     'Accept': 'application/json', // 明确接受 JSON 响应
    //     Origin: 'https://juejin.cn',
    //     Referer: 'https://juejin.cn/editor/drafts/' + this.post_id,
    //   },
    // })
    return [
      {
        id: imageId,
        object_key: imageId,
        url: src // data.data,
      },
    ]
  }


  async preEditPost(post) {
    // var div = $('<div>')
    // $('body').append(div)
    // try {
    //   console.log('Juejin')
    //   div.html(post.content)
    //   var doc = div
    //   tools.processDocCode(div)
    //   tools.makeImgVisible(div)

    //   var tempDoc = $('<div>').append(doc.clone())
    //   post.content =
    //     tempDoc.children('div').length == 1
    //       ? tempDoc.children('div').html()
    //       : tempDoc.html()

    //   console.log('after.predEdit', post.content)
    // } catch (e) {
    //   console.log('preEdit.error', e)
    // }
  }

  addPromotion(post) {
    // var sharcode = `<blockquote><p>本文使用 <a href="https://juejin.cn/post/6940875049587097631" class="internal">文章同步助手</a> 同步</p></blockquote>`
    // post.content = post.content.trim() + `${sharcode}`
  }
}


function generateSnowflakeUUID(workerId = 1) {
  const EPOCH = new Date('2019-01-01').getTime(); // 自定义起始时间
  let sequence = 0;

  let timestamp = Date.now() - EPOCH;
  const binaryTimestamp = timestamp.toString(2).padStart(41, '0');
  const binaryWorkerId = workerId.toString(2).padStart(10, '0');
  const binarySequence = sequence.toString(2).padStart(12, '0');

  const uuidBinary = binaryTimestamp + binaryWorkerId + binarySequence;
  return BigInt('0b' + uuidBinary).toString();
}
