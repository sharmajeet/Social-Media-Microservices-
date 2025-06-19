const nlp = require('compromise');
const logger = require('./logger');

async function parseEntities(text) {
    const doc = nlp(text);
    
    const parsedData = {
        name: null,
        email: null,
        phone: null,
        age: null,
        skills: [],
        experience: [],
        education: [],
        languages: [],
        certifications: [],
        summary: null,
        location: null,
        links: {
            linkedin: null,
            github: null,
            portfolio: null
        },
        projects: [] // Added projects array
    };

    try {
        // Extract name - improved patterns
        const namePatterns = [
            // Look for name at the very beginning (first 200 chars)
            /^[\s\S]{0,50}?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
            // Name before contact info
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[\s\S]{0,50}?(?:[\d\-\+\(\)]+|@)/,
            // Standard name pattern
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/m,
            // After "Name:" label
            /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i
        ];
        
        for (const pattern of namePatterns) {
            const nameMatch = text.match(pattern);
            if (nameMatch && nameMatch[1]) {
                const potentialName = nameMatch[1].trim();
                // Validate it's likely a name (not a section header)
                if (!potentialName.match(/^(Professional|Technical|Education|Experience|Skills|Summary)/i)) {
                    parsedData.name = potentialName;
                    break;
                }
            }
        }

        // Extract email
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = text.match(emailPattern);
        if (emailMatches && emailMatches.length > 0) {
            parsedData.email = emailMatches[0].toLowerCase();
        }

        // Extract phone - improved pattern
        const phonePatterns = [
            /[\+\d][\d\-\.\s\(\)]{9,15}\d/,
            /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
            /\+\d{1,3}[-.\s]?\d{10}/
        ];
        
        for (const pattern of phonePatterns) {
            const phoneMatch = text.match(pattern);
            if (phoneMatch) {
                parsedData.phone = phoneMatch[0].trim();
                break;
            }
        }

        // Extract location - look near contact info
        const locationPatterns = [
            /(?:Location|Address|City)[:\s]+([A-Za-z\s,]+)/i,
            /([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)+)(?=\s*[\+\d\(]|\s*[a-zA-Z0-9._%+-]+@)/,
            /\b([A-Z][a-z]+,\s*[A-Z][a-z]+)\b/
        ];
        
        for (const pattern of locationPatterns) {
            const locationMatch = text.match(pattern);
            if (locationMatch && locationMatch[1]) {
                const location = locationMatch[1].trim();
                if (location.includes(',')) {
                    parsedData.location = location;
                    break;
                }
            }
        }

        // Extract summary/objective - improved patterns
        const summaryPatterns = [
            /(?:Professional\s+)?Summary[:\s]+([\s\S]{50,800}?)(?=Education|Experience|Technical|Skills|$)/i,
            /(?:Career\s+)?Objective[:\s]+([\s\S]{50,800}?)(?=Education|Experience|Technical|Skills|$)/i,
            /Profile[:\s]+([\s\S]{50,800}?)(?=Education|Experience|Technical|Skills|$)/i,
            /About\s+Me[:\s]+([\s\S]{50,800}?)(?=Education|Experience|Technical|Skills|$)/i
        ];
        
        for (const pattern of summaryPatterns) {
            const summaryMatch = text.match(pattern);
            if (summaryMatch && summaryMatch[1]) {
                parsedData.summary = summaryMatch[1].trim()
                    .replace(/\s+/g, ' ')
                    .replace(/\n{2,}/g, '\n');
                break;
            }
        }

        // Extract skills - improved section detection
        const skillsPatterns = [
            /(?:Technical\s+)?Skills[:\s]+([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}|Experience|Projects|Education|Certifications|$)/i,
            /Core\s+Competencies[:\s]+([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}|Experience|Projects|Education|$)/i,
            /Technologies[:\s]+([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}|Experience|Projects|Education|$)/i
        ];
        
        for (const pattern of skillsPatterns) {
            const skillsMatch = text.match(pattern);
            if (skillsMatch && skillsMatch[1]) {
                const skillsText = skillsMatch[1];
                
                // Extract category-based skills
                const categoryPattern = /([A-Za-z\s]+):\s*([^:\n]+)(?=\n|$)/g;
                let categoryMatch;
                const categorizedSkills = [];
                
                while ((categoryMatch = categoryPattern.exec(skillsText)) !== null) {
                    const skills = categoryMatch[2]
                        .split(/[,;]/)
                        .map(s => s.trim())
                        .filter(s => s.length > 1 && s.length < 50);
                    categorizedSkills.push(...skills);
                }
                
                // Also get skills not in categories
                const plainSkills = skillsText
                    .split(/[,;•·\n]/)
                    .map(s => s.trim())
                    .filter(s => s.length > 1 && s.length < 50)
                    .filter(s => !s.includes(':') && !s.match(/^(and|or|with|in|at|for)$/i));
                
                parsedData.skills = [...new Set([...categorizedSkills, ...plainSkills])];
                break;
            }
        }

        // Extract experience - improved patterns
        const experiencePatterns = [
            /(?:Professional\s+)?Experience[:\s]+([\s\S]*?)(?=Technical\s+Skills|Education|Projects|Certifications|Key\s+Projects|$)/i,
            /Work\s+(?:Experience|History)[:\s]+([\s\S]*?)(?=Technical\s+Skills|Education|Projects|Certifications|$)/i,
            /Employment\s+History[:\s]+([\s\S]*?)(?=Technical\s+Skills|Education|Projects|Skills|$)/i
        ];
        
        for (const pattern of experiencePatterns) {
            const expMatch = text.match(pattern);
            if (expMatch && expMatch[1]) {
                const expText = expMatch[1];
                
                // Split by company/position patterns
                const jobSections = expText.split(/(?=(?:[A-Z][A-Za-z\s&,\.]+)?(?:\s+[A-Z][a-z]+\s+\d{4}\s*[-–]\s*(?:[A-Z][a-z]+\s+\d{4}|Present)|\s+\d{4}\s*[-–]\s*(?:\d{4}|Present)))/);
                
                const experiences = jobSections
                    .filter(section => section.trim().length > 20)
                    .map(section => {
                        const lines = section.trim().split('\n').filter(l => l.trim());
                        
                        // Extract company and date from first few lines
                        let company = '';
                        let title = '';
                        let duration = '';
                        let location = '';
                        
                        // Look for date pattern
                        const datePattern = /([A-Z][a-z]+\s+\d{4}\s*[-–]\s*(?:[A-Z][a-z]+\s+\d{4}|Present)|\d{4}\s*[-–]\s*(?:\d{4}|Present))/;
                        
                        for (let i = 0; i < Math.min(4, lines.length); i++) {
                            const line = lines[i];
                            const dateMatch = line.match(datePattern);
                            
                            if (dateMatch) {
                                duration = dateMatch[1];
                                // Company is usually before the date
                                company = line.substring(0, line.indexOf(dateMatch[0])).trim();
                                // Title might be on the next line
                                if (i + 1 < lines.length) {
                                    title = lines[i + 1].trim();
                                }
                            } else if (i === 0 && !company) {
                                // First line might be company
                                company = line;
                            } else if (i === 1 && !title) {
                                // Second line might be title
                                title = line;
                            }
                            
                            // Check for location (City, State pattern)
                            if (line.match(/[A-Z][a-z]+,\s*[A-Z][a-z]+/)) {
                                location = line.match(/[A-Z][a-z]+,\s*[A-Z][a-z]+/)[0];
                            }
                        }
                        
                        // Get description (bullet points or remaining text)
                        const descStartIndex = lines.findIndex(l => 
                            l.startsWith('•') || 
                            l.startsWith('-') || 
                            l.startsWith('*') ||
                            l.match(/^Project:/i)
                        );
                        
                        const description = descStartIndex >= 0 
                            ? lines.slice(descStartIndex).join(' ').replace(/[•\-\*]/g, '').trim()
                            : lines.slice(2).join(' ').trim();
                        
                        return {
                            title: title || 'Not specified',
                            company: company || 'Not specified',
                            duration: duration || null,
                            location: location || null,
                            description: description
                        };
                    })
                    .filter(exp => exp.company !== 'Not specified' || exp.title !== 'Not specified');
                
                parsedData.experience = experiences;
                break;
            }
        }

        // Extract education - improved parsing
        const educationSection = text.match(/Education[:\s]+([\s\S]*?)(?=Professional\s+Experience|Experience|Projects|Technical\s+Skills|Skills|Certifications|$)/i);
        if (educationSection && educationSection[1]) {
            const eduText = educationSection[1];
            
            // Split by common degree patterns or institutions
            const eduSections = eduText.split(/(?=(?:Bachelor|Master|PhD|Ph\.D|B\.|M\.|BS|MS|MBA|University|Institute|College))/i);
            
            const educations = eduSections
                .filter(edu => edu.trim().length > 10)
                .map(edu => {
                    const lines = edu.trim().split('\n').filter(l => l.trim());
                    
                    let degree = '';
                    let institution = '';
                    let year = '';
                    let details = '';
                    
                    // Extract year range
                    const yearMatch = edu.match(/(\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*Present)/);
                    if (yearMatch) {
                        year = yearMatch[1];
                    }
                    
                    // Extract GPA
                    const gpaMatch = edu.match(/(?:GPA|CGPA)[:\s]*([0-9.]+)/i);
                    if (gpaMatch) {
                        details = `GPA: ${gpaMatch[1]}`;
                    }
                    
                    // Parse lines
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        if (line.match(/University|Institute|College|School/i) && !institution) {
                            institution = line.trim();
                        } else if (line.match(/Bachelor|Master|B\.|M\.|BS|MS|MBA|PhD/i) && !degree) {
                            degree = line.trim();
                        } else if (i === 0 && !institution && !degree) {
                            // First line might be institution
                            institution = line.trim();
                        } else if (i === 1 && !degree) {
                            // Second line might be degree
                            degree = line.trim();
                        }
                    }
                    
                    return {
                        degree: degree || lines[0] || '',
                        institution: institution || lines[1] || '',
                        year: year || null,
                        details: details
                    };
                })
                .filter(edu => edu.degree || edu.institution);
            
            parsedData.education = educations;
        }

        // Extract certifications
        const certSection = text.match(/Certifications?[:\s]+([\s\S]*?)(?=Projects|Experience|Skills|Languages|$)/i);
        if (certSection && certSection[1]) {
            const certText = certSection[1];
            const certifications = certText
                .split(/[•·\n]/)
                .map(c => c.trim())
                .filter(c => c.length > 5 && c.length < 200)
                .filter(c => !c.match(/^(and|or|with|in|at|for)$/i));
            parsedData.certifications = certifications;
        }

        // Extract projects
        const projectSection = text.match(/(?:Key\s+)?Projects[:\s]+([\s\S]*?)(?=Certifications|Technical\s+Skills|Skills|Languages|$)/i);
        if (projectSection && projectSection[1]) {
            const projectText = projectSection[1];
            
            // Split by project names (usually followed by dates or bullet points)
            const projectSections = projectText.split(/(?=(?:[A-Z][A-Za-z\s\-]+)(?:\s*[-–]\s*[A-Za-z\s,]+)?\s*(?:[A-Z][a-z]+\s+\d{4}|•|\n))/);
            
            const projects = projectSections
                .filter(section => section.trim().length > 20)
                .map(section => {
                    const lines = section.trim().split('\n').filter(l => l.trim());
                    
                    let name = '';
                    let duration = '';
                    let description = [];
                    
                    // Extract project name and duration from first line
                    const firstLine = lines[0];
                    const dateMatch = firstLine.match(/([A-Z][a-z]+\s+\d{4}\s*[-–]\s*[A-Z][a-z]+\s+\d{4}|[A-Z][a-z]+\s+\d{4}\s*[-–]\s*Present|\d{4})/);
                    
                    if (dateMatch) {
                        duration = dateMatch[0];
                        name = firstLine.substring(0, firstLine.indexOf(dateMatch[0])).replace(/[-–]\s*$/, '').trim();
                    } else {
                        name = firstLine.trim();
                    }
                    
                    // Get description bullets
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                            description.push(line.replace(/^[•\-\*]\s*/, ''));
                        } else if (line.length > 20) {
                            description.push(line);
                        }
                    }
                    
                    return {
                        name: name,
                        duration: duration || null,
                        description: description.join(' ')
                    };
                })
                .filter(proj => proj.name);
            
            parsedData.projects = projects;
        }

        // Extract LinkedIn - improved pattern
        const linkedinPatterns = [
            /linkedin\.com\/in\/([\w-]+)/i,
            /Linkedin\s*[:\s]*([\w-]+)/i,
            /linkedin[:\s]+(https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)/i
        ];
        
        for (const pattern of linkedinPatterns) {
            const linkedinMatch = text.match(pattern);
            if (linkedinMatch) {
                const username = linkedinMatch[1] || linkedinMatch[2];
                parsedData.links.linkedin = `https://linkedin.com/in/${username}`;
                break;
            }
        }

        // Extract GitHub - improved pattern
        const githubPatterns = [
            /github\.com\/([\w-]+)/i,
            /Github\s*[:\s]*([\w-]+)/i,
            /github[:\s]+(https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)/i
        ];
        
        for (const pattern of githubPatterns) {
            const githubMatch = text.match(pattern);
            if (githubMatch) {
                const username = githubMatch[1] || githubMatch[2];
                parsedData.links.github = `https://github.com/${username}`;
                break;
            }
        }

        // Extract portfolio
        const portfolioPatterns = [
            /portfolio[:\s]+(https?:\/\/[^\s]+)/i,
            /website[:\s]+(https?:\/\/[^\s]+)/i,
            /personal\s+site[:\s]+(https?:\/\/[^\s]+)/i
        ];
        
        for (const pattern of portfolioPatterns) {
            const portfolioMatch = text.match(pattern);
            if (portfolioMatch) {
                parsedData.links.portfolio = portfolioMatch[1];
                break;
            }
        }

        // Extract languages (spoken languages, not programming)
        const langSection = text.match(/(?:Spoken\s+)?Languages?[:\s]+([\s\S]*?)(?=\n[A-Z][A-Z\s]{3,}|Skills|Projects|$)/i);
        if (langSection && langSection[1]) {
            const langText = langSection[1];
            // Only extract if it doesn't contain programming languages
            if (!langText.match(/JavaScript|Python|Java|C\+\+|Ruby|PHP/i)) {
                const languages = langText
                    .split(/[,;•·\n]/)
                    .map(l => l.trim())
                    .filter(l => l.length > 1 && l.length < 50)
                    .filter(l => !l.match(/Programming|Backend|Frontend|Technologies/i));
                parsedData.languages = languages;
            }
        }

        // Also look for common programming languages and technologies in the full text
        const techKeywords = [
            'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin',
            'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
            'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure',
            'Git', 'Linux', 'REST', 'GraphQL', 'Machine Learning', 'AI', 'Data Science',
            'TypeScript', 'Go', 'Rust', 'Scala', 'R', 'MATLAB', 'TensorFlow', 'PyTorch',
            '.NET', 'Laravel', 'Rails', 'Flutter', 'React Native', 'Xamarin', 'Unity',
            'Jenkins', 'CircleCI', 'Travis CI', 'Terraform', 'Ansible', 'Elasticsearch'
        ];
        
        techKeywords.forEach(tech => {
            // Escape special regex characters
            const escapedTech = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
            
            if (text.match(regex) && !parsedData.skills.some(skill => skill.toLowerCase() === tech.toLowerCase())) {
                parsedData.skills.push(tech);
            }
        });

        // Remove duplicates from skills
        parsedData.skills = [...new Set(parsedData.skills)];

        logger.info('Successfully parsed resume entities');
        return parsedData;

    } catch (error) {
        logger.error('Error parsing entities:', error);
        throw error;
    }
}

module.exports = parseEntities;