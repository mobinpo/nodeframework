# @nodevel/blade

**Blade** templating engine for [Nodevel](https://github.com/mobinpo/nodeframework) — a Laravel-inspired templating language for Node.js.

## Features

- **Directives** — `@if`, `@foreach`, `@include`, `@extends` / `@section` / `@yield`, and more
- **Components & slots** — `<x-alert>` style components with named and default slots
- **Layouts & stacks** — template inheritance, `@push` / `@stack` asset management
- **Fragments** — htmx-friendly partial rendering
- **Escaped output by default** — `{{ $value }}` escapes; `{!! $value !!}` renders raw

## Installation

```shell
npm install @nodevel/blade
```

Blade ships as a dependency of [`@nodevel/framework`](https://www.npmjs.com/package/@nodevel/framework), so most applications get it automatically via the installer:

```shell
npm install -g @nodevel/cli
nodevel new project-name
```

## Quick Example

```blade
{{-- resources/views/greeting.blade.php --}}
<h1>Hello, {{ $name }}</h1>

@if ($items)
    <ul>
        @foreach ($items as $item)
            <li>{{ $item }}</li>
        @endforeach
    </ul>
@endif
```

```ts
return view('greeting', { name: 'World', items: ['a', 'b'] });
```

## Documentation

See the [Blade documentation](https://github.com/mobinpo/nodeframework/blob/main/docs/blade.md) in the Nodevel repository.

## License

[MIT](https://github.com/mobinpo/nodeframework/blob/main/LICENSE)
