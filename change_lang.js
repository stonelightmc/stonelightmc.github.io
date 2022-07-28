const select = document.querySelector('select');
const allLang = ['ru', 'en']

select.addEventListener('change', changeURLLanguage)

function changeURLLanguage() {
    let lang = document.querySelector('select').value;
    location.href = window.location.pathname + '#' + lang;
    location.reload();
}

function changeLanguage() {
    let hash = window.location.hash;
    hash = hash.substring(1);
    if (!allLang.includes(hash)) {
        location.href = window.location.pathname + '#ru';
        location.reload();
    }
    select.value = hash;
for (let key in LangArr) {
    document.querySelector('.lng-' + key).innerHTML = LangArr[key][hash];
}
}
changeLanguage();