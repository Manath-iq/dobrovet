# Промпты для картинок ДоброВет

Если расширение Chrome не поднимается — сгенерируйте сами на chatgpt.com,
всё **в одном чате подряд**, чтобы модель держала единый стиль.
Скачанные файлы кладите в `assets/photos/_placeholder/` с указанными именами,
дальше я их подключу и подгоню под вёрстку.

Промпты по-английски намеренно: модель так точнее.

---

## Стиль серии — вставлен в каждый промпт

> Bright, clean, documentary photography of a small-town veterinary practice.
> Natural daylight, no harsh flash. Calm, competent, unglamorous — a real working
> clinic, not a glossy stock studio. Palette accents of electric blue (#015BF9)
> and off-white in the environment. No text, no signage, no logos, no watermark.

---

## 1. Главный кадр — вырез животного `hero-cutout.png`

Это самое важное изображение на сайте: оно ложится поверх гигантского заголовка.
**Нужен настоящий альфа-канал**, иначе приём не сработает.

```
Studio portrait of a calm domestic cat and a medium-sized mixed-breed dog
sitting close together, side by side, both facing the camera with relaxed,
friendly expressions. The dog sits slightly behind and to the right of the cat.
Details: soft even studio light from the front-left, natural fur texture,
sharp focus on both faces, no collars with tags, no toys, no props.
Style: clean commercial pet photography, warm and trustworthy, not cutesy.
Output it as a PNG with a real alpha channel and a fully transparent background:
no background fill, no white plate behind the animals, no drawn checkerboard
pattern, no drop shadow, no reflection, no text.
For a veterinary clinic landing page hero, where the animals will be placed
over large typography on a solid blue background.
```

Проверить после скачивания: файл должен быть **прозрачным**, а не с белым фоном.
Если пришла нарисованная шахматка — правьте в том же чате:
`The checkerboard is drawn into the image. Re-export the same subject as a PNG with a real alpha channel instead.`

---

## 2–5. Четыре шага визита — квадраты 1:1

Каждый следующий начинайте со слов
`Same style, palette and lighting as the previous image. Now: ...`

### 2. `shag-1-zvonok.jpg`
```
Same style, palette and lighting as the previous image. Now:
Square 1:1 photograph. Scene: the reception desk of a small veterinary clinic,
soft daylight from a window on the left.
Subject: the hands of a receptionist holding a desk phone handset, an open
paper appointment book and a pen on the counter.
Details: shallow depth of field, the face is out of frame, clean uncluttered desk.
Constraints: no text, no signage, no logos, no watermark, no visible faces.
For a "how a visit works" step image on a veterinary clinic website.
```

### 3. `shag-2-osmotr.jpg`
```
Same style, palette and lighting as the previous image. Now:
Square 1:1 photograph. Scene: a veterinary examination room, bright even daylight.
Subject: the hands of a veterinarian in a blue scrub top gently examining a calm
grey cat standing on a stainless steel examination table.
Details: the vet's face is out of frame, focus on the hands and the cat,
stethoscope resting on the table.
Constraints: no text, no logos, no watermark, no visible faces, no distress.
For a "how a visit works" step image on a veterinary clinic website.
```

### 4. `shag-3-diagnostika.jpg`
```
Same style, palette and lighting as the previous image. Now:
Square 1:1 photograph. Scene: a diagnostic room in a small veterinary clinic.
Subject: an ultrasound machine screen glowing softly in a dimmer room, a hand
holding the probe at the edge of the frame.
Details: the screen shows an abstract greyscale scan pattern, not readable text
or numbers; equipment looks used and real, not showroom-new.
Constraints: no readable text, no numbers, no logos, no watermark, no faces.
For a "how a visit works" step image on a veterinary clinic website.
```

### 5. `shag-4-naznacheniya.jpg`
```
Same style, palette and lighting as the previous image. Now:
Square 1:1 photograph. Scene: a desk in a veterinary consulting room, warm daylight.
Subject: hands writing on a blank prescription pad, a pen, and a small stack of
medicine boxes with completely blank plain packaging.
Details: shallow depth of field, uncluttered, calm.
Constraints: the paper and packaging must be entirely blank — no text, no letters,
no numbers, no logos, no watermark, no faces.
For a "how a visit works" step image on a veterinary clinic website.
```

---

## 6. Широкий кадр интерьера `interer.jpg` (16:9) — по желанию

```
Same style, palette and lighting as the previous image. Now:
Wide 16:9 photograph. Scene: the corridor and waiting area of a small, tidy
veterinary clinic, daylight from a window at the far end.
Details: simple chairs, clean floor, a closed door to an examination room,
a hint of electric blue on a wall or a chair. Empty of people.
Constraints: no text, no signage, no logos, no watermark, no people.
For an interior section on a veterinary clinic website.
```

---

## После скачивания

1. Положить в `assets/photos/_placeholder/` под указанными именами.
2. Сказать мне — я подключу их в вёрстку, сожму в WebP, пропишу `width`/`height`
   и `loading="lazy"`, и проверю, что раскладка не поехала.
3. Помнить: это **плейсхолдеры**. Перед публикацией их меняют реальные кадры
   клиники по списку в `PHOTO-PLAN.md`. Врачей подписывать именами нельзя —
   в `CONTENT.md` там `—` и «уточняется».
