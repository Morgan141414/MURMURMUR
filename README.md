# Saphena 2.0 / M.I.S.

Медицинская информационная система на Python/FastAPI для мультиклиничной платформы.

Проект ведется по ТЗ Аманата от 16.04.2026. Полный текст ТЗ извлечен в
`docs/tz-amanat-extracted.txt`, а текущий состав первого релиза закреплен в
`docs/mvp1-scope.md`.

## Цель продукта

Платформа должна позволять разным клиникам, филиалам, сотрудникам, врачам,
пациентам, администраторам, колл-центру, техподдержке и модераторам работать в
единой системе с изоляцией медицинских данных между клиниками.

Backend строится как API-first, чтобы веб-версия и будущие мобильные приложения
для врачей и пациентов использовали одни и те же стабильные API.

## MVP 1

В первый MVP входят:

- мультиклиничность;
- регистрация и вход;
- вход по ИИН и паролю;
- роли и права;
- создание клиники через заявку;
- модерация клиники;
- сотрудники;
- пациенты;
- записи;
- расписание;
- базовая медкарта;
- документы и Документолог / шаблонизатор;
- уведомления;
- аудит;
- базовая админ-панель;
- техподдержка;
- CRM.

## Репозиторий

Основной remote:

```text
https://github.com/Morgan141414/MURMURMUR.git
```

Рабочая ветка Codex для текущего контура:

```text
codex/mvp1-docs
```

## Backend MVP1

В репозитории начат FastAPI backend:

- `src/saphena/main.py` - точка входа приложения;
- `src/saphena/modules/models.py` - модели ядра MVP1;
- `src/saphena/api/routers/` - HTTP API;
- `tests/` - базовые интеграционные тесты.

### Локальный запуск

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
python -m uvicorn saphena.main:app --reload
```

После запуска:

```text
http://127.0.0.1:8000/
```

API документация:

```text
http://127.0.0.1:8000/docs
```

### Demo режим

В интерфейсе на главной странице есть кнопка создания demo-данных.

Она подготавливает:

- superadmin;
- founder;
- demo clinic;
- врача;
- пациента;
- CRM лид;
- тикет поддержки;
- одну запись к врачу.

### Проверка

```powershell
python -m pytest
```


## Production readiness

### Требования окружения

- Python 3.12+
- Node.js `>=20.19.0 <21` или `>=22.12.0`
- npm 10+

Node 18 может собрать frontend, но Vite 7 выводит предупреждение и не должен использоваться для production-сборки.

### Переменные окружения

Скопируйте `.env.example` в `.env` и задайте значения под окружение. Для интеграции с Tetis/Projects Control используйте `SAPHENA_TETIS_WEBHOOK_TOKEN`, если webhook должен принимать запросы без bearer-токена superadmin.

### Полная проверка перед релизом

```bash
python3 -m pytest -q
cd frontend && npm run lint && npm run build
```

Если установлен `ruff`, дополнительно:

```bash
python3 -m ruff check src tests
```

### Тестовые аккаунты demo seed

Все demo-аккаунты создаются endpoint'ом bootstrap/demo и используют пароль `DemoPass123`:

| Роль | ИИН |
| --- | --- |
| Platform Superadmin | `700101000006` |
| Founder | `700101000016` |
| Doctor | `700101000026` |
| Patient | `700101000036` |
| Reception | `700101000046` |
| Support Agent | `700101000056` |

### Создание клиники

В текущем MVP создание клиники вынесено в Projects Control/Tetis: [https://tetis1.kz/dashboard?createOrg=1](https://tetis1.kz/dashboard?createOrg=1). M.I.S. принимает синхронизацию клиник через `POST /api/v1/integrations/tetis/clinics`.
