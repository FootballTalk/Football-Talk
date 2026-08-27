(() => {
  const LOGO='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdAQE9MR1NDS0pVWF9gY2FmYWZlY2NnZmpoZ2P/2wBDARESEhgVGC8aGy9jQkJCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAaAGADASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAAIDBAEF/8QAJRAAAgEDAwMEAwAAAAAAAAAAAQIDAAQRBRIhMRMiQVEyYXGB/8QAFwEBAQEBAAAAAAAAAAAAAAAAAQIDBP/EAB0RAQEAAgMBAQAAAAAAAAAAAAABAhEhAzESQYH/2gAMAwEAAhEDEQA/APcwyD7z6ETGlrkkmQVGTjJH59qI9h+3O6gcoPspuUeM4r1c5R9VJ1wMd9H5VqVk0ZfIi8xGftLaTvUEH5VyHDSXImlWQw2g3A6fehpwmEE08sSxE/FgOorI5bUqyFvRkftSlv4YKxOLW8sl3PsHIx1rxbVoYs2+u2qK6vru2s4J4gxJGVuN/wBRTWj/AEiLZnuD+Ee9PEWYXAaoMk5J7VL/Yf7Sf/AIxYef8AoGL/AMKwh28bo3JdmCCT+DHX9K1N0zmPjC9XcHyOhrJrOLbnnbGvc2xk8mGJ0wpwBgfvc1Z7mh4kyNhFvTBLKyjd1I7A4rM0ufA0OwPjEfOn5Qp/QD0rb3KzGONvvk+M5Rjn9KqL7Z5UjP8ADckfyGK2yctLyLhJ3Hk45yMGrxYmNTRyDpIViyj1FZn/McMF/7ga7t40tbeIlUtGaTRVAjL2yQF+YH8qjNubtzKsmr0J0uLp5VmuZPvOBwAPwqqKn44psYq4jknJ6VbIFwqI+Y9D+VfjvxUwt1C8yeMhnYCud27P9qHkpJ6+1VRkmWQY72ILGTx6Vw8Suyk+jlVFFKq2ykqPboP8AKqLtcPLx8y3b1u9WoRLq0EcMcyQfKAHGOnBx9aWlmd4TDILHgVXDyZOzKPlmzzxV0xl1K8xlYmUyGM48/wBqWbYIP3HEUiyZcX0bTQSRrJLbw3p5ONoHrVC7DYgbNxPQj1qqt1eQz7fb7zHf3oKYZ5RZvk2kaQtDcZPI9aYYd9l12xeIeW+tRkxx4/n/AFGNLccCO8e9Ba8ZNGE8T/8AJbx9BTmdv/2Q==';
  const apply=()=>{
    document.querySelectorAll('.brand-mark,.mark').forEach(mark=>{
      mark.textContent='';
      Object.assign(mark.style,{
        backgroundImage:`url(${LOGO})`,
        backgroundSize:'cover',
        backgroundPosition:'center',
        backgroundColor:'transparent',
        borderRadius:'50%',
        transform:'none',
        overflow:'hidden',
        flex:'0 0 auto'
      });
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
