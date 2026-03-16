import os
from jinja2 import Environment, FileSystemLoader

# Initialization
template_dir = 'templates'
env = Environment(loader=FileSystemLoader(template_dir))

# Mock url_for to handle static assets and page links
def url_for(endpoint, **values):
    if endpoint == 'static':
        return f"./{values.get('filename')}"
    
    mapping = {
        'index': 'index.html',
        'about': 'about.html',
        'floor_plan': 'floor-plan.html'
    }
    return mapping.get(endpoint, "#")

# Add mocks to the Jinja environment globals
env.globals['url_for'] = url_for

def compile_static_html():
    print("🚀 Starting Pure Jinja2 -> Static HTML Compilation...")
    
    pages = [
        {'endpoint': 'index', 'template': 'index.html', 'output': 'index.html'},
        {'endpoint': 'about', 'template': 'about.html', 'output': 'about.html'},
        {'endpoint': 'floor_plan', 'template': 'floor_plan.html', 'output': 'floor-plan.html'}
    ]
    
    for page in pages:
        print(f"📄 Compiling '{page['template']}' -> {page['output']}...")
        
        # Mock the request object specifically for each page
        request_mock = type('MockRequest', (), {'endpoint': page['endpoint']})
        
        template = env.get_template(page['template'])
        content = template.render(request=request_mock)
        
        # Write to the root directory
        with open(page['output'], 'w') as f:
            f.write(content)
            
    print("✅ Compilation complete!")

if __name__ == '__main__':
    compile_static_html()
