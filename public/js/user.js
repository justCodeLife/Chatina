let messages = [], page = 1, recorder = null, room = null, token = null, user = null, canFetch = true, new_count = 0,
    stream = null, search_timer, new_messages = [],
    voice_length_limit = 0, totalSeconds = 0, timerInterval, search_index = 0;
let socket = io({autoConnect: false, transports: ['websocket']})
const api = axios.create({baseURL: '/api', withCredentials: true})
const chat_form = document.getElementById('chat-form')
const mic_btn = document.getElementById('mic_btn')
const send_btn = document.getElementById('send_btn')
const message_input = document.getElementById('message_input')
const btn_scroll_down = document.getElementById('btn_scroll_down')
const scroll_area = document.getElementById('scroll_area')
const spinner = document.getElementById('spinner')
const alert_modal = document.getElementById('alert_modal')
const alert_dialog = alert_modal.firstElementChild
const alert_body = alert_dialog.firstElementChild.lastElementChild
const timer = document.getElementById('timer')
const minutesLabel = document.getElementById("minutes");
const secondsLabel = document.getElementById("seconds");
const room_name = document.getElementById('room_name')
const search = document.getElementById('search')
const btn_search_up = document.getElementById('btn_search_up')
const btn_search_down = document.getElementById('btn_search_down')
const search_result_count = document.getElementById('search_result_count')
const search_result_index = document.getElementById('search_result_index')
const modal = new bootstrap.Modal(alert_modal)
chat_form.addEventListener('submit', e => {
    e.preventDefault()
    submit_form()
})
message_input.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter' && message_input.value.trim()) {
        e.preventDefault()
        // message_input.value += '\n'
        // message_input.scrollTop = message_input.scrollHeight;
    } else if (e.key === 'Enter' && message_input.value.trim()) {
        e.preventDefault()
    }
})
message_input.addEventListener('keypress', (e) => {
    if (e.ctrlKey && e.key === 'Enter' && message_input.value.trim()) {
        e.preventDefault()
        // message_input.value += '\n'
        // message_input.scrollTop = message_input.scrollHeight;
    } else if (e.key === 'Enter' && message_input.value.trim()) {
        e.preventDefault()
    }
})
message_input.addEventListener('keyup', (e) => {
    send_btn.disabled = message_input.value.trim() === '';
    if (e.ctrlKey && e.key === 'Enter' && message_input.value.trim()) {
        message_input.value += '\n'
        message_input.scrollTop = message_input.scrollHeight;
    } else if (e.key === 'Enter' && message_input.value.trim()) {
        e.preventDefault()
        submit_form()
    }
})
document.addEventListener('DOMContentLoaded', async () => {
    const room_slug = new URLSearchParams(window.location.search).get('room');
    token = new URLSearchParams(window.location.search).get('token');
    let res;
    try {
        if (token && room_slug) {
            res = await api.get(`/get_logged_in_user`, {params: {token}})
            if (res && res.data.error) {
                show_fullscreen_modal(res.data.error)
                return
            }
            user = res.data
            res = await api.post('/init_data', {token, room: room_slug})
            if (res && res.data.error) {
                show_fullscreen_modal(res.data.error)
            } else {
                page = res.data.pages_count
                room = res.data.room
                voice_length_limit = room.voice_length_limit
                room_name.textContent = `اتاق ${room.title}`
                if (parseInt(page) > 0) {
                    let data = [];
                    res = await api.post('/rooms/messages', {token, page, room_id: room._id})
                    if (res && res.data.error) {
                        show_fullscreen_modal(res.data.error)
                        return
                    }
                    page--;
                    data = res.data
                    if (res.data.length < 20 && page > 0) {
                        res = await api.post('/rooms/messages', {token, page, room_id: room._id})
                        data = data.concat(res.data)
                    }
                    for (const msg of data) {
                        const el = document.createElement('div')
                        if (msg.user._id === user._id) {
                            el.setAttribute('id', msg._id)
                            el.setAttribute('data-is', `توسط شما در ${msg.created_at}`)
                            el.className = 'balon1 p-2 m-0 position-relative'
                            if (msg.is_voice === true) {
                                el.innerHTML = `<audio preload="none" controls controlsList="nodownload">
                                        <source src="${msg.file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                            } else if (msg.is_file === true) {
                                el.innerHTML = `<a href="${msg.file_path}" target="_blank" class="float-start d-flex align-items-center justify-content-between">
                            <div style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">
                                <span class="file_text" style="display:block;">${msg.file_name}</span>
                                <small style="float:right;font-size: 8pt;margin: 0 0.25rem">${msg.file_size}</small>
                            </div>
                           <i class="file_icon fa ${file_type_icons(msg.file_type)} fa-2x" aria-hidden="true"></i></a>`
                            } else {
                                const m = msg.message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                                el.innerHTML = `<a class=float-start>${m}</a>`
                            }
                        } else {
                            el.setAttribute('id', msg._id)
                            el.setAttribute('data-is', `توسط ${msg.user.name || 'ناشناس'} در ${msg.created_at}`)
                            el.className = 'balon2 p-2 m-0 position-relative'
                            if (msg.is_voice === true) {
                                el.innerHTML = `<audio preload="none" class="float-end" controls controlsList="nodownload">
                                        <source src="${msg.file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`

                            } else if (msg.is_file === true) {
                                el.innerHTML = `<a href="${msg.file_path}" target="_blank" class="float-end d-flex align-items-center justify-content-between">
                               <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${msg.file_name}</span>
                                <small style="font-size: 7pt">${msg.file_size}</small>
                            </div>                           
                            <i class="file_icon fa ${file_type_icons(msg.file_type)} fa-2x" aria-hidden="true"></i></a>`
                            } else {
                                const m = msg.message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                                el.innerHTML = `<a class=float-end>${m}</a>`
                            }
                        }
                        scroll_area.append(el)
                    }
                    scroll_area.scrollTop = scroll_area.scrollHeight


                }
                socket.io.opts.query = `user_id=${user._id}&username=${user.username}&room=${room.slug}`
                socket.connect()
                if (user && room) {
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        if ((await navigator.mediaDevices.enumerateDevices()).some(d => d.kind === 'audioinput')) {
                            try {
                                const mediaStream = await navigator.mediaDevices.getUserMedia({audio: true})
                                if (mediaStream) {
                                    stream = mediaStream
                                } else {
                                    disable_mic('مرورگر از ضبط صدا پشتیبانی نمی کند')
                                }
                            } catch (err) {
                                switch (err.name) {
                                    case 'NotFoundError':
                                    case 'DevicesNotFoundError':
                                    case 'SourceUnavailableError':
                                        disable_mic('میکروفن یافت نشد')
                                        console.log(err)
                                        break;
                                    case 'PermissionDeniedError':
                                    case 'SecurityError':
                                    case 'NotAllowedError':
                                        disable_mic('دسترسی به میکروفن وجود ندارد')
                                        console.log(err)
                                        break;
                                    default:
                                        disable_mic('مشکلی در دسترسی به میکروفن وجود دارد')
                                        console.log(err)
                                        return;
                                }
                            }
                        } else {
                            disable_mic('میکروفن یافت نشد')
                        }
                    } else {
                        disable_mic('مرورگر از ضبط صدا پشتیبانی نمی کند')
                    }
                }
            }
        } else {
            show_fullscreen_modal('اتاق یا توکن نامعتبر است')
        }
    } catch (e) {
        console.log(e)
        show_fullscreen_modal()
    }
})
mic_btn.addEventListener('mousedown', async () => {
    mic_btn.style.color = 'red'
    timer.parentElement.className = 'd-flex align-items-center justify-content-around col-lg-4 col-md-4 col-6 m-0 pt-1'
    timer.parentElement.previousElementSibling.className = 'col-lg-8 col-md-8 col-6 m-0 p-1'
    timer.style.display = 'inline-block'
    clearInterval(timerInterval)
    timerInterval = setInterval(setTime, 1000);
    try {
        recorder = new RecordRTCPromisesHandler(stream, {
            type: 'audio',
            mimeType: 'audio/ogg',
            timeSlice: voice_length_limit * 1000 || 60000,
            disableLogs: true,
        });
        recorder.startRecording();
    } catch (e) {
        console.log(e)
        show_error_modal('خطا در ضبط صدا : در دسترس بودن میکروفن را بررسی کنید')
    }
})
mic_btn.addEventListener('mouseup', async () => {
    mic_btn.style.color = 'black'
    disable_timer()
    try {
        if (recorder && recorder != null) {
            await recorder.stopRecording();
            const blob = await recorder.getBlob();
            if (blob && blob.size > 1000 && recorder != null) {
                socket.emit('voice', blob, room)
                const blobUrl = URL.createObjectURL(blob);
                const el = document.createElement('div')
                el.setAttribute('data-is', `توسط شما در ${moment().locale('fa').format('HH:mm:ss YYYY/M/D')}`)
                el.className = 'balon1 p-2 m-0 position-relative'
                el.innerHTML = `<audio preload="none" controls controlsList="nodownload">
                    <source src="${blobUrl}" type="audio/ogg">
                   مرورگر شما از پخش صدا پشتیبانی نمی کند
                 </audio>`
                scroll_area.append(el)
                scroll_area.scrollTop = scroll_area.scrollHeight
            }
        }
    } catch (e) {
        console.log(e)
    }
})
mic_btn.addEventListener('mouseout', (e) => {
    mic_btn.style.color = 'black'
    disable_timer()
    recorder = null
})
window.addEventListener('load', () => {
    scroll_area.scrollTop = scroll_area.scrollHeight
    const emojiElement = document.createElement('div')
    const emojis = [
        9994,
        9995,
        9996,
        9997,
        10060,
        10067,
        10068,
        10069,
        10071,
        127799,
        127800,
        127801,
        127802,
        128070,
        128071,
        128072,
        128073,
        128074,
        128075,
        128076,
        128077,
        128078,
        128079,
        128512,
        128513,
        128514,
        128515,
        128516,
        128517,
        128518,
        128521,
        128522,
        128525,
        128526,
        128528,
        128529,
        128530,
        128531,
        128532,
        128533,
        128542,
        128543,
        128544,
        128545,
        128550,
        128551,
        128552,
        128556,
        128557,
        128558,
        128562,
        128563,
        128564,
        128566,
        128567,
        128577,
        128578,
        128580,
        129296,
        129300,
        129306,
        129309,
        129315,
        129488,
        129505
    ]
    emojiElement.className = 'd-flex flex-wrap'
    emojiElement.style.fontSize = '1.2rem'
    for (const e of emojis) {
        const span = document.createElement('span')
        span.setAttribute('id', e)
        span.className = 'p-1 col'
        span.style.cursor = 'pointer'
        span.onclick = (event) => {
            event.preventDefault()
            event.stopPropagation()
            message_input.value += String.fromCodePoint(e)
            send_btn.disabled = false
        }
        span.textContent = String.fromCodePoint(e)
        emojiElement.append(span)
    }
    const popover = new bootstrap.Popover(document.querySelector('.popover-dismiss'), {
        trigger: 'focus',
        placement: 'top',
        html: true,
        content: emojiElement,
        container: document.getElementById('emoji_btn')
    })
});
scroll_area.addEventListener('scroll', async () => {
    if (new_messages[0]) {
        const position = document.getElementById(new_messages[0]).getBoundingClientRect()
        if (position.top >= 0 && position.bottom <= window.innerHeight) {
            new_messages.shift()
            new_count--
        }
    }
    if ((scroll_area.scrollHeight - scroll_area.scrollTop) < 700) {
        btn_scroll_down.style.display = 'none'
        btn_scroll_down.lastChild.style.display = 'none'
        new_count = 0
    } else {
        btn_scroll_down.lastChild.textContent = new_count.toString()
        btn_scroll_down.style.display = 'inline-block'
    }
    if (scroll_area.scrollTop === 0) {
        spinner.className = 'd-flex justify-content-center'
        canFetch = true
        if (page > 0) {
            scroll_area.scrollTop = 100
        }
    }
    if (scroll_area.scrollTop > scroll_area.offsetHeight) {
        canFetch = true
    }
    if (scroll_area.scrollTop < scroll_area.offsetHeight && canFetch === true) {
        canFetch = false
        spinner.className = 'd-none'
        try {
            if (parseInt(page) > 0) {
                const res = await api.post('/rooms/messages', {token, page, room_id: room._id})
                if (res && res.data.error) {
                    show_fullscreen_modal(res.data.error)
                    return
                }
                page--
                for (let i = res.data.length - 1; i >= 0; i--) {
                    const el = document.createElement('div')
                    if (res.data[i].user._id === user._id) {
                        el.setAttribute('id', res.data[i]._id)
                        el.setAttribute('data-is', `توسط شما در ${res.data[i].created_at}`)
                        el.className = 'balon1 p-2 m-0 position-relative'
                        if (res.data[i].is_voice === true) {
                            el.innerHTML = `<audio preload="none" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                        } else if (res.data[i].is_file === true) {
                            el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-start d-flex align-items-center justify-content-between">
                           <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                            </div>                              
                             <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                        } else {
                            const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                            el.innerHTML = `<a class=float-start>${m}</a>`
                        }
                    } else {
                        el.setAttribute('id', res.data[i]._id)
                        el.setAttribute('data-is', `توسط ${res.data[i].user.name || 'ناشناس'} در ${res.data[i].created_at}`)
                        el.className = 'balon2 p-2 m-0 position-relative'
                        if (res.data[i].is_voice === true) {
                            el.innerHTML = `<audio preload="none" class="float-end" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                        } else if (res.data[i].is_file === true) {
                            el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-end d-flex align-items-center justify-content-between">
                             <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                            </div>                              
                              <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                        } else {
                            const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                            el.innerHTML = `<a class=float-end>${m}</a>`
                        }
                    }
                    scroll_area.prepend(el)
                }
            }
        } catch (e) {
            console.log(e)
            show_error_modal()
        }
    }
})
btn_scroll_down.addEventListener('click', () => {
    scroll_area.scrollTop = scroll_area.scrollHeight
    btn_scroll_down.lastChild.style.display = 'none'
    new_count = 0
})
search.addEventListener('keyup', (e) => {
    clearTimeout(search_timer)
    const prevSearch = document.getElementById(messages[search_index])
    if (prevSearch) {
        prevSearch.firstElementChild.classList.remove('bg-success')
    }
    try {
        if (search.value.trim()) {
            search_timer = setTimeout(async () => {
                const res = await api.post('/rooms/messages', {token, search: search.value, room_id: room._id})
                if (res && res.data.error) {
                    show_error_modal(res.data.error)
                    return
                }
                btn_search_up.style.display = 'inline-block'
                btn_search_up.disabled = true
                btn_search_down.style.display = 'inline-block'
                btn_search_down.disabled = true
                messages = res.data
                search_index = messages.length - 1
                if (messages.length > 0) {
                    search_result_index.textContent = '1'
                    btn_search_up.disabled = false
                } else {
                    search_result_index.textContent = '0'
                }
                if (messages.length < 2) {
                    btn_search_down.disabled = true
                    btn_search_up.disabled = true
                }
                search_result_count.textContent = messages.length.toString()
                search_result_count.parentElement.style.display = 'inline-block'
                search.className = 'rounded-pill form-control-sm border col-6 col-lg-5 col-md-5'
                const search_element = document.getElementById(messages[search_index])
                if (search_element) {
                    search_element.scrollIntoView()
                    search_element.firstElementChild.classList.add('bg-success')
                    scroll_area.scrollTop -= 100
                } else {
                    room_name.textContent = 'لطفا صبر کنید...'
                    while (page > 0) {
                        const res = await api.post('/rooms/messages', {token, page, room_id: room._id})
                        if (res) {
                            if (res && res.data.error) {
                                show_fullscreen_modal(res.data.error)
                                return
                            }
                            page--
                            for (let i = res.data.length - 1; i >= 0; i--) {
                                const el = document.createElement('div')
                                if (res.data[i].user._id === user._id) {
                                    el.setAttribute('id', res.data[i]._id)
                                    el.setAttribute('data-is', `توسط شما در ${res.data[i].created_at}`)
                                    el.className = 'balon1 p-2 m-0 position-relative'
                                    if (res.data[i].is_voice === true) {
                                        el.innerHTML = `<audio preload="none" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                                    } else if (res.data[i].is_file === true) {
                                        el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-start d-flex align-items-center justify-content-between">
                                <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                               </div>                          
                                   <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                                    } else {
                                        const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                                        el.innerHTML = `<a class=float-start>${m}</a>`
                                    }
                                } else {
                                    el.setAttribute('id', res.data[i]._id)
                                    el.setAttribute('data-is', `توسط ${res.data[i].user.name || 'ناشناس'} در ${res.data[i].created_at}`)
                                    el.className = 'balon2 p-2 m-0 position-relative'
                                    if (res.data[i].is_voice === true) {
                                        el.innerHTML = `<audio preload="none" class="float-end" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`

                                    } else if (res.data[i].is_file === true) {
                                        el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-end d-flex align-items-center justify-content-between">
                             <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                            </div>                               
                             <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                                    } else {
                                        const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                                        el.innerHTML = `<a class=float-end>${m}</a>`
                                    }
                                }
                                scroll_area.prepend(el)
                            }
                            const search_element = document.getElementById(messages[search_index])
                            if (search_element) {
                                search_element.scrollIntoView()
                                search_element.firstElementChild.classList.add('bg-success')
                                scroll_area.scrollTop -= 100
                                break
                            }
                        }
                    }
                    room_name.textContent = `اتاق ${room.title}`
                }
            }, 1000);
        } else {
            messages = []
            search_index = 0
            btn_search_up.style.display = 'none'
            btn_search_down.style.display = 'none'
            search_result_count.parentElement.style.display = 'none'
            search_result_count.textContent = '0'
            search_result_index.textContent = '0'
            search.className = 'rounded-pill form-control-sm border col-12 col-lg-12 col-md-12'
        }
    } catch (e) {
        console.log(e)
        show_error_modal('جستجو با خطا مواجه شد')
    }
})
search.addEventListener('keydown', () => {
    clearTimeout(search_timer)
})
btn_search_up.addEventListener('click', async () => {
    const first = document.getElementById(messages[search_index])
    if (first) {
        first.firstElementChild.classList.remove('bg-success')
    }
    search_index--
    search_result_index.textContent = (messages.length - search_index).toString()
    btn_search_down.disabled = false
    if (search_index <= 0) {
        btn_search_up.disabled = true
    }
    const search_element = document.getElementById(messages[search_index])
    if (search_element) {
        search_element.scrollIntoView()
        search_element.firstElementChild.classList.add('bg-success')
        scroll_area.scrollTop -= 100
    } else {
        try {
            const prevSearch = document.getElementById(messages[search_index])
            if (prevSearch) {
                prevSearch.firstElementChild.classList.remove('bg-success')
            }
            room_name.textContent = 'لطفا صبر کنید...'
            while (page > 0) {
                const res = await api.post('/rooms/messages', {token, page, room_id: room._id})
                if (res && res.data.error) {
                    show_fullscreen_modal(res.data.error)
                    return
                }
                page--
                for (let i = res.data.length - 1; i >= 0; i--) {
                    const el = document.createElement('div')
                    if (res.data[i].user._id === user._id) {
                        el.setAttribute('id', res.data[i]._id)
                        el.setAttribute('data-is', `توسط شما در ${res.data[i].created_at}`)
                        el.className = 'balon1 p-2 m-0 position-relative'
                        if (res.data[i].is_voice === true) {
                            el.innerHTML = `<audio preload="none" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                        } else if (res.data[i].is_file === true) {
                            el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-start d-flex align-items-center justify-content-between">
                            <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                            </div>                             
                               <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                        } else {
                            const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                            el.innerHTML = `<a class=float-start>${m}</a>`
                        }
                    } else {
                        el.setAttribute('id', res.data[i]._id)
                        el.setAttribute('data-is', `توسط ${res.data[i].user.name || 'ناشناس'} در ${res.data[i].created_at}`)
                        el.className = 'balon2 p-2 m-0 position-relative'
                        if (res.data[i].is_voice === true) {
                            el.innerHTML = `<audio preload="none" class="float-end" controls controlsList="nodownload">
                                        <source src="${res.data[i].file_path}" type="audio/ogg">
                                       مرورگر شما از پخش صدا پشتیبانی نمی کند
                                     </audio>`
                        } else if (res.data[i].is_file === true) {
                            el.innerHTML = `<a href="${res.data[i].file_path}" target="_blank" class="float-end d-flex align-items-center justify-content-between">
                           <div>
                                <span class="file_text" style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">${res.data[i].file_name}</span>
                                <small style="font-size: 7pt">${res.data[i].file_size}</small>
                            </div>                   
                            <i class="file_icon fa ${file_type_icons(res.data[i].file_type)} fa-2x" aria-hidden="true"></i></a>`
                        } else {
                            const m = res.data[i].message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
                            el.innerHTML = `<a class=float-end>${m}</a>`
                        }
                    }
                    scroll_area.prepend(el)
                }
                const search_element = document.getElementById(messages[search_index])
                if (search_element) {
                    search_element.scrollIntoView()
                    search_element.firstElementChild.classList.add('bg-success')
                    scroll_area.scrollTop -= 100
                    break
                }
            }
            room_name.textContent = `اتاق ${room.title}`
        } catch (e) {
            console.log(e)
            show_error_modal()
        }
    }
})
btn_search_down.addEventListener('click', () => {
    const first = document.getElementById(messages[search_index])
    if (first) {
        first.firstElementChild.classList.remove('bg-success')
    }
    search_index++
    search_result_index.textContent = (messages.length - search_index).toString()
    btn_search_up.disabled = false
    if (search_index >= messages.length - 1) {
        btn_search_down.disabled = true
    }
    const search_element = document.getElementById(messages[search_index])
    if (search_element) {
        search_element.scrollIntoView()
        search_element.firstElementChild.classList.add('bg-success')
        scroll_area.scrollTop -= 100
    }
})
socket.on('message', ({id, room_id, user_id, message, created_at, name}) => {
    new_count++
    new_messages.push(id)
    if (scroll_area.scrollTop !== 0) {
        btn_scroll_down.lastChild.textContent = new_count.toString()
        btn_scroll_down.lastChild.style.display = 'inline-block'
    }
    const el = document.createElement('div')
    el.setAttribute('id', id)
    el.setAttribute('data-is', `توسط ${name || 'ناشناس'} در ${created_at}`)
    el.className = 'balon2 p-2 m-0 position-relative'
    const m = message.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
    el.innerHTML = `<a class=float-end>${m}</a>`
    scroll_area.append(el)
    new Audio('/js/notif.mp3').play().then().catch(err => console.log(err))
})
socket.on('voice', ({id, room_id, user_id, file_path, created_at, name}) => {
    new_count++
    new_messages.push(id)
    if (scroll_area.scrollTop !== 0) {
        btn_scroll_down.lastChild.textContent = new_count.toString()
        btn_scroll_down.lastChild.style.display = 'inline-block'
    }
    const el = document.createElement('div')
    el.setAttribute('id', id)
    el.setAttribute('data-is', `توسط ${name || 'ناشناس'} در ${created_at}`)
    el.className = 'balon2 p-2 m-0 position-relative'
    el.innerHTML = `<audio preload="none" class="float-end" controls controlsList="nodownload">
        <source src="${file_path}" type="audio/ogg">
       مرورگر شما از پخش صدا پشتیبانی نمی کند
     </audio>`
    scroll_area.append(el)
    new Audio('/js/notif.mp3').play().then().catch(err => console.log(err))
})
socket.on('kickUserFromRoom', () => {
    show_fullscreen_modal('شما از اتاق اخراج شدید')
})
socket.on('disconnect', () => {
    show_fullscreen_modal('عدم دسترسی به اتاق')
})

function submit_form() {
    send_btn.disabled = true
    const el = document.createElement('div')
    el.setAttribute('data-is', `توسط شما در ${moment().locale('fa').format('HH:mm:ss YYYY/M/D')}`)
    el.className = 'balon1 p-2 m-0 position-relative'
    const msg = message_input.value.split('\n').join('<br>').trim().replace(/^(<br>)+|(<br>)+$/g, "")
    el.innerHTML = `<a class=float-start>${msg}</a>`
    scroll_area.append(el)
    scroll_area.scrollTop = scroll_area.scrollHeight
    try {
        socket.emit('message', {
            room_id: room._id,
            user_id: user._id,
            message: message_input.value.trim()
        })
    } catch (e) {
        console.log(e)
        show_error_modal('ارسال پیام با خطا مواجه شد')
    }
    message_input.value = ''
    message_input.focus()
}

function show_error_modal(error) {
    if (alert_dialog.classList.contains('modal-fullscreen')) {
        alert_dialog.classList.remove('modal-fullscreen')
    }
    if (alert_modal.hasAttribute('data-bs-backdrop')) {
        alert_modal.removeAttribute('data-bs-backdrop')
    }
    if (alert_modal.hasAttribute('data-bs-keyboard')) {
        alert_modal.removeAttribute('data-bs-keyboard')
    }
    if (!error) {
        alert_body.textContent = `عملیات با خطا مواجه شد ${String.fromCodePoint(0x1F610)}`
    } else {
        alert_body.textContent = error + String.fromCodePoint(0x1F610)
    }
    modal.show()
}

function show_fullscreen_modal(error) {
    if (!alert_dialog.classList.contains('modal-fullscreen')) {
        alert_dialog.classList.add('modal-fullscreen')
    }
    if (!alert_modal.hasAttribute('data-bs-backdrop')) {
        alert_modal.setAttribute('data-bs-backdrop', 'static')
    }
    if (!alert_modal.hasAttribute('data-bs-keyboard')) {
        alert_modal.setAttribute('data-bs-keyboard', 'false')
    }
    if (!error) {
        alert_body.textContent = `عملیات با خطا مواجه شد ${String.fromCodePoint(0x1F610)}`
    } else {
        alert_body.textContent = error + String.fromCodePoint(0x1F610)
    }
    modal.show()
}

function setTime() {
    ++totalSeconds;
    secondsLabel.innerHTML = pad(totalSeconds % 60);
    minutesLabel.innerHTML = pad(parseInt(totalSeconds / 60));
}

function pad(val) {
    let valString = val + "";
    if (valString.length < 2) {
        return "0" + valString;
    } else {
        return valString;
    }
}

function disable_timer() {
    timer.parentElement.className = 'd-flex align-items-center justify-content-around col-lg-3 col-md-3 col-5 m-0 pt-1'
    timer.parentElement.previousElementSibling.className = 'col-lg-9 col-md-9 col-8 m-0 p-1'
    timer.style.display = 'none'
    clearInterval(timerInterval)
    totalSeconds = 0
    secondsLabel.innerHTML = '00';
    minutesLabel.innerHTML = '00';
}

function disable_mic(error) {
    mic_btn.parentElement.setAttribute('data-bs-toggle', 'tooltip')
    mic_btn.parentElement.setAttribute('data-bs-placement', 'top')
    mic_btn.parentElement.setAttribute('tabindex', '0')
    if (error) {
        mic_btn.parentElement.setAttribute('title', error)
    } else {
        mic_btn.parentElement.setAttribute('title', 'میکروفن یافت نشد')
    }
    mic_btn.style.pointerEvents = 'none'
    mic_btn.disabled = true
}

//------------------------------------------------------------------------------------------------------------
function setProgress(svg, percent = 100) {
    const dasharray = parseInt(svg.getAttribute('stroke-dasharray'))
    const offset = dasharray - (percent / 100 * dasharray)
    svg.lastElementChild.setAttribute('stroke-dashoffset', offset)
}

function cancelReq(id) {
    const cancel = cancelTokens.find(ct => ct.id === id).cancel
    cancel()
    cancelTokens = cancelTokens.filter(ct => ct.id !== id)
    // document.getElementById(id).remove()
}

const file_input = document.getElementById('file_input')
const file_btn = document.getElementById('file_btn')
file_btn.addEventListener('click', () => {
    file_input.click()
})
// let upload_progress = 0;
let cancelTokens = []
const CancelToken = axios.CancelToken;
file_input.addEventListener('change', async (e) => {
    // upload_progress = 0;
    if (e.target.files && e.target.files.length > 0) {
        if (Math.round(e.target.files[0].size / 1000) > 10240) {
            alert('حجم فایل بیش از 10 مگابایت است')
            return
        }
        const id = uuidv4()
        const el = document.createElement('div')
        el.setAttribute('id', id)
        el.setAttribute('data-is', `توسط شما در ${moment().locale('fa').format('HH:mm:ss YYYY/M/D')}`)
        el.className = 'balon1 p-2 m-0 position-relative'
        el.innerHTML = `<a style="min-width: 5rem" class="float-start d-flex align-items-center justify-content-center">
                            <svg height="50" width="50" style="transform: rotate(-90deg);" stroke-dasharray="125">
                                    <circle cx="25" cy="25" r="20" stroke="white" stroke-width="4" fill="transparent"/>
                                    <circle cx="25" cy="25" r="20" stroke="darkorange" stroke-width="4" fill="transparent" stroke-dashoffset="60"/>
                            </svg>
                            <i class="fa fa-close fa-2x" aria-hidden="true"
                                   style="cursor:pointer;position: absolute;font-size: 18pt" onclick="cancelReq(this.parentElement.parentElement.getAttribute('id'))"></i>
                        </a>`
        scroll_area.append(el)
        scroll_area.scrollTop = scroll_area.scrollHeight
        let formData = new FormData()
        formData.append('file', e.target.files[0])
        formData.append('element_id', id)
        formData.append('token', token)
        api.post('/rooms/upload_file', formData, {
            cancelToken: new CancelToken(function executor(cancel) {
                cancelTokens.push({
                    cancel, id
                })
            }),
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                // upload_progress = Math.round((100 * progressEvent.loaded) / progressEvent.total)
                const svg = el.firstElementChild.firstElementChild
                setProgress(svg, Math.round((100 * progressEvent.loaded) / progressEvent.total))
            }
        }).then(res => {
            // upload_progress = 0
            if (res.data.success) {
                el.innerHTML = `<a style="min-width: 5rem" class="float-start d-flex align-items-center justify-content-center">
                                <div class="spinner-border text-light" role="status">
                                <span class="visually-hidden">در حال ارسال...</span></div>
                                </a>`
                socket.emit('file', {
                    room_id: room._id,
                    user_id: user._id,
                    file_path: res.data.path,
                    file_name: res.data.name,
                    file_ext: res.data.ext,
                    file_title: res.data.title,
                    file_size: res.data.size,
                    element_id: res.data.element_id
                })
            } else if (res.data.error) {
                alert(res.data.error)
                el.remove()
            } else {
                alert('ارسال فایل با خطا مواجه شد')
                el.remove()
            }
        }).catch(err => {
            // upload_progress = 0
            alert('ارسال فایل انجام نشد')
            console.log(err)
            el.remove()
        })
    }
})

function file_type_icons(type) {
    switch (true) {
        case ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'tif'].includes(type):
            return 'fa-file-image-o'
        case ['mp3', 'm4a', 'flac', 'wav', 'wma', 'aac'].includes(type):
            return 'fa-file-audio-o'
        case ['mp4', 'mkv', 'flv', 'avi'].includes(type):
            return 'fa-file-video-o'
        case ['doc', 'docx'].includes(type):
            return 'fa-file-word-o'
        case ['ppt', 'pptx'].includes(type):
            return 'fa-file-powerpoint-o'
        case ['xls', 'xlsx'].includes(type):
            return 'fa-file-excel-o'
        case ['rar', 'zip'].includes(type):
            return 'fa-file-zip-o'
        case type === 'pdf':
            return 'fa-file-pdf-o'
        case type === 'txt':
            return 'fa-file-text-o'
        default:
            return 'fa-file-o'
    }
}

socket.on('file', (data) => {
    if (data.is_sender === true) {
        if (data.element_id) {
            const el = document.getElementById(data.element_id)
            el.setAttribute('id', data.id)
            el.innerHTML = `<a href="${data.file_path}" target="_blank" class="float-start d-flex align-items-center justify-content-between">
                          <div style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">
                                <span class="file_text" style="display:block;">${data.file_name}</span>
                                <small style="float:right;font-size: 8pt;margin: 0 0.25rem">${data.file_size}</small>
                            </div>
                           <i class="file_icon fa ${file_type_icons(data.file_type)} fa-2x" aria-hidden="true"></i>
                        </a>`
        }
    } else {
        const el = document.createElement('div')
        el.className = 'balon2 p-2 m-0 position-relative'
        el.setAttribute('id', data.id)
        el.setAttribute('data-is', `توسط ${data.name || 'ناشناس'} در ${data.created_at}`)
        el.innerHTML = `<a href="${data.file_path}" target="_blank" class="float-end d-flex align-items-center justify-content-between">
                          <div style="direction:ltr;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">
                                <span class="file_text" style="display:block;">${data.file_name}</span>
                                <small style="float:right;font-size: 8pt;margin: 0 0.25rem">${data.file_size}</small>
                            </div>
                           <i class="file_icon fa ${file_type_icons(data.file_type)} fa-2x" aria-hidden="true"></i>
                        </a>`
        scroll_area.append(el)
        scroll_area.scrollTop = scroll_area.scrollHeight
    }
})
