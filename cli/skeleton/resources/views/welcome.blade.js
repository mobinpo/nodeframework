<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Nodevel') }}</title>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
               display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
        .card { text-align: center; max-width: 640px; padding: 2rem 3rem; }
        h1 { font-size: 3rem; margin-bottom: .5rem; }
        code { background: #1e293b; padding: .15rem .4rem; border-radius: .25rem; }
        a { color: #7dd3fc; }
    </style>
</head>
<body>
    <div class="card">
        <h1>{{ $name }}</h1>
        <p>The Laravel-inspired framework for Node.js is up and running.</p>
        <p>Next steps: read the <a href="/docs">documentation</a>.</p>
    </div>
</body>
</html>
