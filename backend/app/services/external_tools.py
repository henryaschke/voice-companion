"""
External Tools for Function Calling.

Provides real-time data access for the voice agent:
- News headlines from tagesschau RSS
- Weather (future)
- Other real-time data

All tools return structured data for LLM consumption.
"""
import asyncio
import aiohttp
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
from dataclasses import dataclass


@dataclass
class NewsItem:
    """A single news item."""
    title: str
    description: str
    pubDate: str
    category: Optional[str] = None


class ExternalTools:
    """
    External tools for function calling.
    
    Each tool follows the pattern:
    - Async function that fetches/processes data
    - Returns structured data for LLM context
    - Has a timeout to prevent hanging
    """
    
    # Tool definitions for OpenAI Function Calling
    TOOL_DEFINITIONS = [
        {
            "type": "function",
            "function": {
                "name": "get_news",
                "description": "Ruft aktuelle Nachrichten und Schlagzeilen von tagesschau.de ab. Nutze dieses Tool wenn der Nutzer nach aktuellen Nachrichten, Neuigkeiten, Schlagzeilen oder 'was in der Welt passiert' fragt.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "description": "Optionale Kategorie: 'inland' (Deutschland), 'ausland' (International), 'wirtschaft' (Wirtschaft), 'sport' (Sport). Leer lassen für alle Nachrichten.",
                            "enum": ["", "inland", "ausland", "wirtschaft", "sport"]
                        },
                        "count": {
                            "type": "integer",
                            "description": "Anzahl der Nachrichten (1-5). Standard: 3",
                            "default": 3
                        }
                    },
                    "required": []
                }
            }
        }
    ]
    
    # RSS Feed URLs
    RSS_URLS = {
        "": "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml",
        "inland": "https://www.tagesschau.de/inland/index~rss2.xml",
        "ausland": "https://www.tagesschau.de/ausland/index~rss2.xml",
        "wirtschaft": "https://www.tagesschau.de/wirtschaft/index~rss2.xml",
        "sport": "https://www.tagesschau.de/sport/index~rss2.xml"
    }
    
    def __init__(self, call_sid: str = "unknown"):
        """Initialize external tools."""
        self.call_sid = call_sid
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=5)  # 5 second timeout
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def execute_tool(self, tool_name: str, arguments: dict) -> str:
        """
        Execute a tool by name with given arguments.
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Tool arguments as dict
            
        Returns:
            Tool result as string for LLM context
        """
        print(f"[{self.call_sid}] Executing tool: {tool_name} with args: {arguments}")
        
        if tool_name == "get_news":
            return await self.get_news(
                category=arguments.get("category", ""),
                count=arguments.get("count", 3)
            )
        else:
            return f"Unbekanntes Tool: {tool_name}"
    
    async def get_news(self, category: str = "", count: int = 3) -> str:
        """
        Fetch current news from tagesschau RSS feed.
        
        Args:
            category: News category (inland, ausland, wirtschaft, sport) or empty for all
            count: Number of news items to return (1-5)
            
        Returns:
            Formatted news summary for the LLM
        """
        try:
            # Validate inputs
            count = max(1, min(5, count))  # Clamp to 1-5
            url = self.RSS_URLS.get(category, self.RSS_URLS[""])
            
            print(f"[{self.call_sid}] Fetching news from: {url}")
            
            session = await self._get_session()
            
            async with session.get(url) as response:
                if response.status != 200:
                    print(f"[{self.call_sid}] RSS fetch failed: HTTP {response.status}")
                    return "Entschuldigung, ich konnte die Nachrichten gerade nicht abrufen."
                
                xml_content = await response.text()
            
            # Parse RSS XML
            root = ET.fromstring(xml_content)
            
            news_items: list[NewsItem] = []
            
            for item in root.findall('.//item'):
                if len(news_items) >= count:
                    break
                
                title = item.find('title')
                description = item.find('description')
                pubDate = item.find('pubDate')
                
                if title is not None and title.text:
                    news_items.append(NewsItem(
                        title=title.text.strip(),
                        description=description.text.strip() if description is not None and description.text else "",
                        pubDate=pubDate.text.strip() if pubDate is not None and pubDate.text else "",
                        category=category or "allgemein"
                    ))
            
            if not news_items:
                return "Es gibt gerade keine aktuellen Nachrichten."
            
            # Format for LLM
            category_name = {
                "": "Aktuelle",
                "inland": "Deutschland",
                "ausland": "Internationale",
                "wirtschaft": "Wirtschafts",
                "sport": "Sport"
            }.get(category, "Aktuelle")
            
            result_parts = [f"=== {category_name} Nachrichten von tagesschau.de ===\n"]
            
            for i, item in enumerate(news_items, 1):
                result_parts.append(f"{i}. {item.title}")
                if item.description:
                    # Truncate long descriptions
                    desc = item.description[:150] + "..." if len(item.description) > 150 else item.description
                    result_parts.append(f"   {desc}")
                result_parts.append("")
            
            result = "\n".join(result_parts)
            print(f"[{self.call_sid}] News fetched: {len(news_items)} items")
            
            return result
            
        except asyncio.TimeoutError:
            print(f"[{self.call_sid}] RSS fetch timeout")
            return "Entschuldigung, das Abrufen der Nachrichten hat zu lange gedauert."
        except ET.ParseError as e:
            print(f"[{self.call_sid}] RSS parse error: {e}")
            return "Entschuldigung, ich konnte die Nachrichten gerade nicht verarbeiten."
        except Exception as e:
            print(f"[{self.call_sid}] News fetch error: {e}")
            return "Entschuldigung, beim Abrufen der Nachrichten ist ein Fehler aufgetreten."


# Phrases to say while fetching data
FETCHING_PHRASES = [
    "Lass mich das kurz für dich herausfinden...",
    "Moment, ich schau mal nach...",
    "Einen Augenblick, ich hole die Infos...",
    "Kurz warten, ich schaue nach...",
]


def get_fetching_phrase() -> str:
    """Get a random phrase to say while fetching data."""
    import random
    return random.choice(FETCHING_PHRASES)

