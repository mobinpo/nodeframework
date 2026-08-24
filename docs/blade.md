# Blade Templates

- [Introduction](#introduction)
- [Displaying Data](#displaying-data)
- [Blade Directives](#blade-directives)
    - [If Statements](#if-statements)
    - [Switch Statements](#switch-statements)
    - [Loops](#loops)
    - [The Loop Variable](#the-loop-variable)
    - [Conditional Classes](#conditional-classes)
    - [Including Subviews](#including-subviews)
    - [Raw JavaScript](#raw-javascript)
    - [Comments](#comments)
- [Components](#components)
    - [Rendering Components](#rendering-components)
    - [Slots](#slots)
- [Building Layouts](#building-layouts)
- [Forms](#forms)
- [Stacks](#stacks)

<a name="introduction"></a>
## Introduction

Blade is the simple, yet powerful templating engine included with Nodevel. Blade templates use the `.blade.js` file extension and are stored in `resources/views`. Templates are compiled to plain JavaScript and cached until modified, adding essentially zero overhead.

Blade views may be returned from routes or controllers using the global `view` helper:

```js
Route.get('/', () => view('greeting', { name: 'Finn' }));
```

Expressions inside Blade are written in JavaScript; `$variable` references and the PHP-style object operator `->` are translated automatically.

<a name="displaying-data"></a>
## Displaying Data

Wrap variables in curly braces:

```blade
Hello, {{ $name }}.
```

Blade's `{{ }}` echo statements automatically escape HTML entities to prevent XSS attacks. To emit unescaped data use `{!! $name !!}` — be very careful when echoing user supplied content this way.

<a name="blade-directives"></a>
## Blade Directives

<a name="if-statements"></a>
### If Statements

```blade
@if (count($records) === 1)
    I have one record!
@elseif (count($records) > 1)
    I have multiple records!
@else
    I don't have any records!
@endif
```

For convenience, Blade provides `@unless`, `@isset`, and `@empty` directives. The `@auth` / `@guest` directives check authentication, while `@production` / `@env('staging')` check the environment:

```blade
@auth
    // The user is authenticated...
@endauth
```

<a name="switch-statements"></a>
### Switch Statements

```blade
@switch($i)
    @case(1)
        First case...
        @break

    @default
        Default case...
@endswitch
```

<a name="loops"></a>
### Loops

```blade
@for ($i = 0; $i < 10; $i++)
    The current value is {{ $i }}
@endfor

@foreach ($users as $user)
    <p>This is user {{ $user.id }}</p>
@endforeach

@forelse ($users as $user)
    <li>{{ $user.name }}</li>
@empty
    <p>No users</p>
@endforelse

@while (true)
    <p>I'm looping forever.</p>
@endwhile
```

Use `@continue` and `@break` inside loops.

<a name="the-loop-variable"></a>
### The Loop Variable

A `$loop` variable is available inside every loop:

| Property           | Description                                        |
| ------------------ | -------------------------------------------------- |
| `$loop->index`     | Index of the current iteration (starts at 0).      |
| `$loop->iteration` | Current iteration (starts at 1).                   |
| `$loop->first`     | Whether this is the first iteration.               |
| `$loop->last`      | Whether this is the last iteration.                |
| `$loop->count`     | Total items being iterated.                        |
| `$loop->parent`    | In nested loops, the parent loop's variable.       |

```blade
@foreach ($users as $user)
    @if (!$loop->first), @endif{{ $user.name }}
@endforeach
```

<a name="conditional-classes"></a>
### Conditional Classes & Styles

The `@class` directive conditionally compiles a CSS class string:

```blade
<span @class(['p-4', 'font-bold' => $isActive])></span>
```

Likewise `@style`, plus `@checked`, `@selected`, `@disabled`, `@readonly` and `@required` for form attributes.

<a name="including-subviews"></a>
### Including Subviews

```blade
@include('shared.errors')

@includeWhen($boolean, 'view.name')

@includeIf('view.name')
```

<a name="raw-javascript"></a>
### Raw JavaScript

Embed plain JavaScript with `@php ... @endphp` (a historical name kept for familiarity — it executes JavaScript):

```blade
@php
    $counter = 1;
@endphp
```

Import application modules into template scope with `@use`:

```blade
@use('App/Helpers/format_currency')
```

Resolve services from the container with `@inject`:

```blade
@inject('metrics', 'metrics.service')
<div>Monthly Revenue: {{ $metrics.monthlyRevenue() }}</div>
```

<a name="comments"></a>
### Comments

Blade comments are not present in rendered HTML:

```blade
{{-- This comment will not be present in the rendered output --}}
```

<a name="components"></a>
## Components

Components group reusable markup with data and slots. Create one with Artisan:

```shell
npx tsx bin/artisan.ts make:component Alert          # class + view
npx tsx bin/artisan.ts make:component forms.input --view   # anonymous view component
```

Class components live in `app/View/Components`; anonymous templates in `resources/views/components`.

<a name="rendering-components"></a>
### Rendering Components

Render components using their tag — kebab-case names map back to your files:

```blade
<x-alert type="error" :message="$message" class="mb-4"/>

<x-forms.input />
```

Static values pass as strings; prefix an attribute with `:` to pass a JavaScript expression.

<a name="slots"></a>
### Slots

Pass content through the default slot or named slots:

```blade
<div class="alert">
    <span class="alert-title">{{ $title }}</span>

    {{ $slot }}
</div>
```

```xml
<x-alert>
    <x-slot:title>
        Server Error
    </x-slot>

    <strong>Whoops!</strong> Something went wrong!
</x-alert>
```

<a name="building-layouts"></a>
## Building Layouts

Layouts may be built with a layout component:

```blade
<!-- resources/views/components/layout.blade.js -->
<html>
    <head><title>{{ $title ?? 'Todo Manager' }}</title></head>
    <body>{{ $slot }}</body>
</html>
```

Or via template inheritance with sections:

```blade
<!-- resources/views/layouts/app.blade.js -->
<html>
    <head><title>App - @yield('title')</title></head>
    <body>@yield('content')</body>
</html>
```

```blade
<!-- resources/views/child.blade.js -->
@extends('layouts.app')

@section('title', 'Page Title')

@section('content')
    <p>This is my body content.</p>
@endsection
```

<a name="forms"></a>
## Forms

Any HTML form pointing to a POST route should include a CSRF token field:

```blade
<form method="POST" action="/profile">
    @csrf
    ...
</form>
```

Since HTML forms can't make PUT/PATCH/DELETE requests, add a hidden method field:

```blade
<form action="/foo/bar" method="POST">
    @method('PUT')
    @csrf
</form>
```

Display validation errors with the `@error` directive:

```blade
@error('title')
    <div class="alert alert-danger">{{ $message }}</div>
@enderror
```

<a name="stacks"></a>
## Stacks

Push content to named stacks rendered elsewhere in a layout:

```blade
@push('scripts')
    <script src="/example.js"></script>
@endpush

<head>
    @stack('scripts')
</head>
```

`@once ... @endonce` ensures content renders once per cycle, and `@pushOnce` combines both behaviors.
