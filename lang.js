window.addEventListener("load", lang);

function lang() {
    if(Cookies.get('lang') == "ua") {
        let tranElem = document.getElementsByClassName("trans");
        if (tranElem.length != 0) {
            var langReq = new XMLHttpRequest();
            langReq.open('GET', '/lang/lang.json');
            langReq.onload = function () {
                if (langReq.status != 200) {
                    alert("Ошибка загрузки языка");
                } else {
                    let lang = JSON.parse(langReq.responseText)["lang"];
                    for (let i = 0; i < tranElem.length; i++) {
                        tranElem[i].textContent = lang[i]["ua"];
                    }
                }
            };
            langReq.send();
        }
        keyLangReq == undefined
        var keyLangReq = new XMLHttpRequest();
        keyLangReq.open('GET', '/lang/lang-key.json');
        keyLangReq.onload = function () {
            if (keyLangReq.status != 200) {
                alert("Ошибка загрузки языка");
            } else {
                let keyLang = JSON.parse(keyLangReq.responseText);
                Object.keys(keyLang).forEach(function(k){
                    let toEdit = document.getElementsByClassName(k);
                    for (let i = 0; i < toEdit.length; i++) {
                        toEdit[i].textContent = keyLang[k]["ua"];
                    }
                });
            }
        };
        keyLangReq.send();
    }
}