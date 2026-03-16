import os
from jinja2 import Environment, FileSystemLoader

# Initialization
template_dir = 'templates'
env = Environment(loader=FileSystemLoader(template_dir))

def compile_static_html():
    print("🚀 Starting Pure Jinja2 -> Directory-Based Static HTML Compilation...")
    
    pages = [
        {'endpoint': 'index', 'template': 'index.html', 'output': 'index.html', 'depth': 0},
        {'endpoint': 'about', 'template': 'about.html', 'output': 'about/index.html', 'depth': 1},
        {'endpoint': 'floor_plan', 'template': 'floor_plan.html', 'output': 'floors/index.html', 'depth': 1}
    ]
    
    for page in pages:
        print(f"📄 Compiling '{page['template']}' -> {page['output']}...")
        
        # Ensure directory exists for nested pages
        output_dir = os.path.dirname(page['output'])
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # Custom url_for mock that respects depth
        prefix = "../" * page['depth']
        
        def url_for_mock(endpoint, **values):
            if endpoint == 'static':
                return f"{prefix}{values.get('filename')}"
            
            mapping = {
                'index': f"{prefix}index.html",
                'about': f"{prefix}about/index.html",
                'floor_plan': f"{prefix}floors/index.html"
            }
            return mapping.get(endpoint, "#")

        # Mock the request object specifically for each page
        request_mock = type('MockRequest', (), {'endpoint': page['endpoint']})
        
        # Fresh globals for each page because of prefix logic
        env.globals['url_for'] = url_for_mock
        
        template = env.get_template(page['template'])
        content = template.render(request=request_mock)
        
        # No longer mangling the pretty URLs to index.html
        # This ensures /floors and /about work as clean URLs on the static host
        pass

        # Write to the root directory
        with open(page['output'], 'w') as f:
            f.write(content)
            
    print("✅ Compilation complete!")

if __name__ == '__main__':
    compile_static_html()
