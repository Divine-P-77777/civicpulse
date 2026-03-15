import pkg_resources
import os

req_path = r'c:\civicpulse\civicpulse-backend\requirements.txt'
pinned_path = r'c:\civicpulse\civicpulse-backend\requirements_pinned.txt'

with open(req_path, 'r') as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]

# Get current installed versions
installed_packages = {pkg.key: pkg.version for pkg in pkg_resources.working_set}

pinned_requirements = []
seen_packages = set()

for req in requirements:
    # Basic package name extraction (handles comments and basic specifiers)
    pkg_name_part = req.split('==')[0].split('>=')[0].split('<=')[0].split('<')[0].split('>')[0].split(' ')[0].strip().lower().replace('-', '_')
    
    # Check both original and normalized names
    pkg_key = pkg_name_part.replace('_', '-')
    
    version = installed_packages.get(pkg_key) or installed_packages.get(pkg_name_part)
    
    if version:
        pinned_line = f"{pkg_key}=={version}"
        if pinned_line not in seen_packages:
            pinned_requirements.append(pinned_line)
            seen_packages.add(pinned_line)
    else:
        # If not found in current environment, keep original specifier or name
        if req not in seen_packages:
            pinned_requirements.append(req)
            seen_packages.add(req)

with open(pinned_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sorted(pinned_requirements)) + '\n')

print(f"Pinned requirements written to {pinned_path}")
