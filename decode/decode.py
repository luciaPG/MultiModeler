import re
import urllib.parse
import os
import html

def extraer_svgs(css_content):
    pattern = r'data:image/svg\+xml(?:;charset=utf-8)?,(.*?)["\)]'
    return re.findall(pattern, css_content)

def decode_and_save_svgs(svg_data_list, output_dir, base_name):
    os.makedirs(output_dir, exist_ok=True)
    for i, encoded_svg in enumerate(svg_data_list, 1):
        decoded_svg = urllib.parse.unquote(encoded_svg)
        decoded_svg = html.unescape(decoded_svg)

        # Asegurar xmlns si falta
        if '<svg' in decoded_svg and 'xmlns=' not in decoded_svg:
            decoded_svg = decoded_svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)

        filename_base = f"{base_name}_{i:02}"
        filepath_svg = os.path.join(output_dir, f"{filename_base}.svg")
        filepath_txt = os.path.join(output_dir, f"{filename_base}.txt")

        with open(filepath_svg, 'w', encoding='utf-8') as svg_file:
            svg_file.write(decoded_svg)

        with open(filepath_txt, 'w', encoding='utf-8') as txt_file:
            txt_file.write(decoded_svg)

        print(f"✔️ Guardados: {filename_base}.svg y .txt")

def main():
    input_css = "./decode/estilos.css"
    base_name = os.path.splitext(os.path.basename(input_css))[0]
    output_dir = "./decode/svg-decoded"

    if not os.path.exists(input_css):
        print(f"❌ El archivo {input_css} no existe.")
        return

    with open(input_css, "r", encoding="utf-8") as f:
        css_content = f.read()

    svg_data_list = extraer_svgs(css_content)
    if not svg_data_list:
        print("⚠️ No se encontraron SVGs embebidos.")
    else:
        print(f"🔍 {len(svg_data_list)} SVG(s) encontrado(s). Procesando...")
        decode_and_save_svgs(svg_data_list, output_dir, base_name)

if __name__ == "__main__":
    main()
