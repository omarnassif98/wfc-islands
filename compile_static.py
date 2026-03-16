import os
import shutil
from jinja2 import Environment, FileSystemLoader

def compile_static_html():
    # Setup Jinja2 environment
    env = Environment(loader=FileSystemLoader('templates'))
    
    # Define pages to compile
    pages = [
        {'template': 'index.html', 'output': 'index.html', 'depth': 0},
        {'template': 'about.html', 'output': 'about/index.html', 'depth': 1},
        {'template': 'floor_plan.html', 'output': 'floors/index.html', 'depth': 1},
    ]

    print("🚀 Starting Pure Jinja2 -> Directory-Based Static HTML Compilation...")

    # Copy static assets to root for the static build
    static_assets = ['style.css', 'main.js', 'floor_plan.js', 'favicon.png']
    for asset in static_assets:
        src = os.path.join('static', asset)
        if os.path.exists(src):
            print(f"📦 Synchronizing asset: {src} -> {asset}")
            shutil.copy2(src, asset)

    for page in pages:
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(page['output'])
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # Mock url_for to handle assets relative to the current page depth
        def url_for_mock(endpoint, **values):
            if endpoint == 'static':
                # For static pages, assets are relative to the root
                return "../" * page['depth'] + values.get('filename', '')
            return values.get('filename', '')

        # Mock request object for active link highlighting
        request_mock = type('Request', (), {'endpoint': page['template'].split('.')[0]})

        # Render template
        template = env.get_template(page['template'])
        content = template.render(request=request_mock, url_for=url_for_mock)
        
        # No longer mangling the pretty URLs to index.html
        # This ensures /floors and /about work as clean URLs on the static host
        pass

        # Write to the root directory
        with open(page['output'], 'w') as f:
            f.write(content)
        print(f"📄 Compiling '{page['template']}' -> {page['output']}...")

    print("✅ Compilation complete!")

if __name__ == "__main__":
    compile_static_html()
