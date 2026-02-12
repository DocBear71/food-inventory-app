# cookie_converter.py - Convert JSON cookies to Netscape format

import json
import sys
import os

def convert_json_to_netscape(json_file, output_file):
    """Convert JSON cookies to Netscape format"""
    
    try:
        with open(json_file, 'r') as f:
            cookies = json.load(f)
        
        with open(output_file, 'w') as f:
            # Write Netscape cookies header
            f.write("# Netscape HTTP Cookie File\n")
            f.write("# This is a generated file! Do not edit.\n\n")
            
            # Convert each cookie
            for cookie in cookies:
                # Extract cookie fields
                domain = cookie.get('domain', '')
                flag = 'TRUE' if domain.startswith('.') else 'FALSE'
                path = cookie.get('path', '/')
                secure = 'TRUE' if cookie.get('secure', False) else 'FALSE'
                
                # Handle expiration
                expires = cookie.get('expirationDate', 0)
                if expires:
                    expires = int(expires)
                else:
                    expires = 0
                
                name = cookie.get('name', '')
                value = cookie.get('value', '')
                
                # Skip empty cookies
                if not name or not domain:
                    continue
                
                # Write in Netscape format
                f.write(f"{domain}\t{flag}\t{path}\t{secure}\t{expires}\t{name}\t{value}\n")
        
        print(f"✅ Successfully converted {len(cookies)} cookies")
        print(f"📁 Output file: {os.path.abspath(output_file)}")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ Error converting cookies: {e}")
        return False

if __name__ == "__main__":
    # Check if JSON file exists
    json_files = [f for f in os.listdir('.') if f.endswith('.json') and 'cookie' in f.lower()]
    
    if json_files:
        json_file = json_files[0]  # Use first cookie JSON file found
        output_file = 'youtube_cookies.txt'
        
        print(f"🍪 Converting {json_file} to {output_file}...")
        
        if convert_json_to_netscape(json_file, output_file):
            print("\n🎉 Conversion complete!")
            print("\nNext steps:")
            print("1. Upload to Modal secrets:")
            print(f"   base64 {output_file} | modal secret create youtube-cookies YOUTUBE_COOKIES=")
            print("2. Or use PowerShell:")
            print(f"   $content = Get-Content {output_file} -Raw")
            print("   $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)")
            print("   $base64 = [Convert]::ToBase64String($bytes)")
            print("   echo $base64 | modal secret create youtube-cookies YOUTUBE_COOKIES=")
        else:
            print("❌ Conversion failed")
    else:
        print("❌ No JSON cookie files found in current directory")
        print("Make sure your cookie JSON file is in this folder")